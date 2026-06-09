import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabaseAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (user.user_metadata?.role !== "prof") {
    return NextResponse.json({ premium: true, skip: true });
  }

  const admin = getSupabaseAdmin();
  const { data: keyRow } = await admin
    .from("activation_keys")
    .select("key, expires_at, used_at, plan")
    .eq("used_by", user.id)
    .order("used_at", { ascending: false })
    .limit(1)
    .single();

  if (!keyRow) {
    return NextResponse.json({ premium: false, reason: "expired" });
  }

  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    return NextResponse.json({
      premium: false,
      reason: "expired",
      expired_at: keyRow.expires_at,
    });
  }

  const plan = keyRow.plan || "starter";

  return NextResponse.json({
    premium: true,
    plan,
    max_students: plan === "starter" ? 45 : null,
    key: keyRow.key,
    expires_at: keyRow.expires_at,
    activated_at: keyRow.used_at,
  });
}
