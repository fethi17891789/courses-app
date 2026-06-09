import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { rateLimitByIp } from "@/lib/rate-limit";
import { hashKey } from "@/lib/hash-key";
import {
  normalizeReferralCode,
  REFERRAL_BONUS_DAYS,
  REFERRAL_COOLDOWN_DAYS,
} from "@/lib/referral";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const { allowed } = rateLimitByIp(request, "signup", 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const body = await request.json();
  const { email, password, fullName, phone, role, activationKey } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "missing_fields" },
      { status: 400 }
    );
  }

  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json(
      { error: "weak_password" },
      { status: 400 }
    );
  }

  let durationDays: number | null = null;
  let hashedKey = "";
  let plan: string = "starter";
  let referrerId: string | null = null;
  let referralCode = "";

  if (role === "prof") {
    if (!activationKey || !activationKey.trim()) {
      return NextResponse.json(
        { error: "missing_key" },
        { status: 400 }
      );
    }

    hashedKey = hashKey(activationKey);
    const { data: keyRow } = await supabaseAdmin
      .from("activation_keys")
      .select("id, used_by, expires_at, duration_days, plan")
      .eq("key", hashedKey)
      .single();

    if (keyRow) {
      if (keyRow.used_by) {
        return NextResponse.json(
          { error: "key_already_used" },
          { status: 400 }
        );
      }

      durationDays = keyRow.duration_days;
      plan = keyRow.plan || "starter";

      // Signup = toujours premiere inscription -> annuel 12 mois devient 15 mois (bonus 3 mois)
      if (durationDays === 365) {
        durationDays = 456;
      }
    } else {
      // Not an activation key: maybe a referral code from a colleague
      referralCode = normalizeReferralCode(activationKey);
      const { data: refRow } = await supabaseAdmin
        .from("referral_codes")
        .select("user_id, code")
        .eq("code", referralCode)
        .single();

      if (!refRow) {
        return NextResponse.json(
          { error: "invalid_key" },
          { status: 400 }
        );
      }

      // One successful referral per cooldown window for the referrer
      const cooldownStart = new Date(
        Date.now() - REFERRAL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      const { count: recentCount } = await supabaseAdmin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", refRow.user_id)
        .gte("created_at", cooldownStart);

      if ((recentCount ?? 0) > 0) {
        return NextResponse.json(
          { error: "referral_cooldown" },
          { status: 400 }
        );
      }

      referrerId = refRow.user_id;
      hashedKey = "";
      durationDays = REFERRAL_BONUS_DAYS;
      plan = "starter";
    }
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName?.trim() || "",
      phone: phone?.trim() || "",
      role,
      plan: role === "prof" ? plan : undefined,
    },
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return NextResponse.json(
        { error: "email_taken" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "generic" },
      { status: 500 }
    );
  }

  if (role === "prof" && authData.user) {
    const now = new Date();
    const expiresAt = durationDays
      ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    if (referrerId) {
      // Track who referred who
      await supabaseAdmin.from("referrals").insert({
        referrer_id: referrerId,
        referred_id: authData.user.id,
        referred_name: fullName?.trim() || email,
        code: referralCode,
      });

      // Free trial for the new prof (synthetic activation key, one per user)
      await supabaseAdmin.from("activation_keys").insert({
        key: hashKey(`referral-${authData.user.id}`),
        plan: "starter",
        duration_days: REFERRAL_BONUS_DAYS,
        used_by: authData.user.id,
        used_at: now.toISOString(),
        expires_at: expiresAt,
      });

      // Bonus for the referrer: extend the current subscription
      const { data: referrerKey } = await supabaseAdmin
        .from("activation_keys")
        .select("id, expires_at")
        .eq("used_by", referrerId)
        .order("used_at", { ascending: false })
        .limit(1)
        .single();

      if (referrerKey && referrerKey.expires_at) {
        const base = new Date(referrerKey.expires_at) > now
          ? new Date(referrerKey.expires_at)
          : now;
        const newExpiry = new Date(
          base.getTime() + REFERRAL_BONUS_DAYS * 24 * 60 * 60 * 1000
        ).toISOString();
        await supabaseAdmin
          .from("activation_keys")
          .update({ expires_at: newExpiry })
          .eq("id", referrerKey.id);
      }
    } else {
      await supabaseAdmin
        .from("activation_keys")
        .update({
          used_by: authData.user.id,
          used_at: now.toISOString(),
          expires_at: expiresAt,
        })
        .eq("key", hashedKey);
    }
  }

  return NextResponse.json({ success: true });
}
