import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/auth-user";
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
  const { allowed } = rateLimitByIp(request, "renew", 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { activationKey } = body;

  if (!activationKey || !activationKey.trim()) {
    return NextResponse.json({ error: "missing_key" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const hashedKey = hashKey(activationKey);
  const { data: keyRow, error: keyError } = await admin
    .from("activation_keys")
    .select("id, used_by, duration_days, plan")
    .eq("key", hashedKey)
    .single();

  if (keyError || !keyRow) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }

  if (keyRow.used_by) {
    return NextResponse.json({ error: "key_already_used" }, { status: 400 });
  }

  let durationDays = keyRow.duration_days;

  // Verifier si c'est la premiere inscription annuelle de cet utilisateur -> bonus 3 mois
  if (durationDays === 270) {
    const { count } = await admin
      .from("activation_keys")
      .select("id", { count: "exact", head: true })
      .eq("used_by", user.id);

    if ((count ?? 0) === 0) {
      durationDays = 360;
    }
  }

  const now = new Date();
  const expiresAt = durationDays
    ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await admin
    .from("activation_keys")
    .update({
      used_by: user.id,
      used_at: now.toISOString(),
      expires_at: expiresAt,
    })
    .eq("key", hashedKey);

  const plan = keyRow.plan || "starter";
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { plan },
  });

  return NextResponse.json({ success: true, expires_at: expiresAt, plan });
}
