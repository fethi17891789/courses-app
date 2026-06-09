import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { rateLimitByIp } from "@/lib/rate-limit";
import { hashKey } from "@/lib/hash-key";

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

  if (role === "prof") {
    if (!activationKey || !activationKey.trim()) {
      return NextResponse.json(
        { error: "missing_key" },
        { status: 400 }
      );
    }

    hashedKey = hashKey(activationKey);
    const { data: keyRow, error: keyError } = await supabaseAdmin
      .from("activation_keys")
      .select("id, used_by, expires_at, duration_days, plan")
      .eq("key", hashedKey)
      .single();

    if (keyError || !keyRow) {
      return NextResponse.json(
        { error: "invalid_key" },
        { status: 400 }
      );
    }

    if (keyRow.used_by) {
      return NextResponse.json(
        { error: "key_already_used" },
        { status: 400 }
      );
    }

    durationDays = keyRow.duration_days;
    plan = keyRow.plan || "starter";

    // Signup = toujours premiere inscription -> annuel 9 mois devient 12 mois
    if (durationDays === 270) {
      durationDays = 365;
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

    await supabaseAdmin
      .from("activation_keys")
      .update({
        used_by: authData.user.id,
        used_at: now.toISOString(),
        expires_at: expiresAt,
      })
      .eq("key", hashedKey);
  }

  return NextResponse.json({ success: true });
}
