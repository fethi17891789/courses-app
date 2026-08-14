import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { rateLimitByIp } from "@/lib/rate-limit";
import { hashKey } from "@/lib/hash-key";
import {
  normalizeReferralCode,
  REFERRAL_BONUS_DAYS,
  REFERRAL_COOLDOWN_DAYS,
} from "@/lib/referral";
import { SCHOOL_SEATS, type SchoolPlan } from "@/lib/admin-pricing";

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
  const { email, password, fullName, phone, role, activationKey, acceptedTerms } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "missing_fields" },
      { status: 400 }
    );
  }

  // Consentement aux CGU : exige cote serveur, pas seulement dans l'interface.
  // Sans lui, aucun compte n'est cree, meme si la requete est forgee a la main.
  if (acceptedTerms !== true) {
    return NextResponse.json(
      { error: "terms_not_accepted" },
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
  // Ecoles : signup directeur (cle school_*) ou prof rejoignant une ecole
  let isDirectorSignup = false;
  let seatLimit: number | null = null;
  let joinOrgId: string | null = null;

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
      .select("id, used_by, expires_at, duration_days, plan, seat_limit")
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

      if (plan === "school_starter" || plan === "school_pro") {
        // Cle ecole : ce compte devient le directeur. On creera l'ecole
        // apres la creation de l'utilisateur. Duree = telle quelle (l'ecole
        // est ouverte toute l'annee, pas de bonus 9->12 mois).
        isDirectorSignup = true;
        seatLimit = keyRow.seat_limit ?? 1;
      } else if (durationDays === 270) {
        // Inde : signup = 1re inscription -> annuel 9 mois devient 12 mois
        durationDays = 360;
      }
    } else {
      // Not an activation key: maybe a referral/school code.
      // Prefixe ECO- = invitation ecole ; sinon = parrainage classique.
      const trimmed = activationKey.trim();
      const isSchoolInvite = /^ECO-/i.test(trimmed);
      const rawCode = isSchoolInvite ? trimmed.replace(/^ECO-/i, "") : trimmed;

      referralCode = normalizeReferralCode(rawCode);
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

      if (isSchoolInvite) {
        const { data: orgRow } = await supabaseAdmin
          .from("organizations")
          .select("id, seat_limit")
          .eq("owner_id", refRow.user_id)
          .single();

        if (!orgRow) {
          return NextResponse.json(
            { error: "invalid_key" },
            { status: 400 }
          );
        }

        const { count: seatsUsed } = await supabaseAdmin
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgRow.id)
          .eq("status", "active");

        if ((seatsUsed ?? 0) >= (orgRow.seat_limit ?? 0)) {
          return NextResponse.json({ error: "school_full" }, { status: 400 });
        }

        joinOrgId = orgRow.id;
        hashedKey = "";
        durationDays = null;
        plan = "pro";
      } else {
        // Parrainage classique : un succes par fenetre de cooldown
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

        const { data: referrerKey } = await supabaseAdmin
          .from("activation_keys")
          .select("plan")
          .eq("used_by", refRow.user_id)
          .order("used_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        plan = referrerKey?.plan || "starter";
      }
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
      // Trace du consentement : date d'acceptation des CGU et de la politique
      // de confidentialite, conservee pour pouvoir en justifier.
      terms_accepted_at: new Date().toISOString(),
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

    if (isDirectorSignup) {
      // Creer l'ecole, puis activer la cle du directeur (son abonnement)
      await supabaseAdmin.from("organizations").insert({
        owner_id: authData.user.id,
        name: fullName?.trim() || email,
        seat_limit: seatLimit ?? 1,
      });
      await supabaseAdmin
        .from("activation_keys")
        .update({
          used_by: authData.user.id,
          used_at: now.toISOString(),
          expires_at: expiresAt,
        })
        .eq("key", hashedKey);
    } else if (joinOrgId) {
      // Prof d'ecole : simple rattachement, aucune cle perso.
      // Son acces vient de l'abonnement du directeur (has_active_access).
      await supabaseAdmin.from("organization_members").insert({
        org_id: joinOrgId,
        user_id: authData.user.id,
      });
    } else if (referrerId) {
      // Track who referred who
      await supabaseAdmin.from("referrals").insert({
        referrer_id: referrerId,
        referred_id: authData.user.id,
        referred_name: fullName?.trim() || email,
        code: referralCode,
      });

      const isSchoolReferral = plan === "school_starter" || plan === "school_pro";

      await supabaseAdmin.from("activation_keys").insert({
        key: hashKey(`referral-${authData.user.id}`),
        plan,
        duration_days: REFERRAL_BONUS_DAYS,
        used_by: authData.user.id,
        used_at: now.toISOString(),
        expires_at: expiresAt,
        ...(isSchoolReferral ? { seat_limit: SCHOOL_SEATS[plan as SchoolPlan] } : {}),
      });

      if (isSchoolReferral) {
        await supabaseAdmin.from("organizations").insert({
          owner_id: authData.user.id,
          name: fullName?.trim() || email,
          seat_limit: SCHOOL_SEATS[plan as SchoolPlan],
        });
      }

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
