import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { generateReferralCode, REFERRAL_COOLDOWN_DAYS } from "@/lib/referral";

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
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  let { data: codeRow } = await admin
    .from("referral_codes")
    .select("code")
    .eq("user_id", user.id)
    .single();

  if (!codeRow) {
    for (let attempt = 0; attempt < 5 && !codeRow; attempt++) {
      const { data: inserted } = await admin
        .from("referral_codes")
        .insert({ user_id: user.id, code: generateReferralCode() })
        .select("code")
        .single();
      if (inserted) codeRow = inserted;
    }
    if (!codeRow) {
      return NextResponse.json({ error: "generic" }, { status: 500 });
    }
  }

  const { data: referrals } = await admin
    .from("referrals")
    .select("referred_name, created_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const lastReferral = referrals?.[0];
  let nextAvailableAt: string | null = null;
  if (lastReferral) {
    const availableAt = new Date(
      new Date(lastReferral.created_at).getTime() +
        REFERRAL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    );
    if (availableAt > new Date()) {
      nextAvailableAt = availableAt.toISOString();
    }
  }

  return NextResponse.json({
    code: codeRow.code,
    count: referrals?.length ?? 0,
    referrals: referrals ?? [],
    next_available_at: nextAvailableAt,
  });
}
