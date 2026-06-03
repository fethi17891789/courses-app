import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { rateLimitByIp } from "@/lib/rate-limit";

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

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { activationKey } = body;

  if (!activationKey || !activationKey.trim()) {
    return NextResponse.json({ error: "missing_key" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: keyRow, error: keyError } = await admin
    .from("activation_keys")
    .select("id, used_by, duration_days")
    .eq("key", activationKey.trim())
    .single();

  if (keyError || !keyRow) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }

  if (keyRow.used_by) {
    return NextResponse.json({ error: "key_already_used" }, { status: 400 });
  }

  const now = new Date();
  const expiresAt = keyRow.duration_days
    ? new Date(now.getTime() + keyRow.duration_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await admin
    .from("activation_keys")
    .update({
      used_by: user.id,
      used_at: now.toISOString(),
      expires_at: expiresAt,
    })
    .eq("key", activationKey.trim());

  return NextResponse.json({ success: true, expires_at: expiresAt });
}
