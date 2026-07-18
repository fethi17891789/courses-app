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
    .maybeSingle();

  // Ce compte possede-t-il une ecole (directeur) ?
  const { data: ownedOrg } = await admin
    .from("organizations")
    .select("seat_limit, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  const keyActive =
    keyRow && (!keyRow.expires_at || new Date(keyRow.expires_at) >= new Date());

  if (keyActive) {
    const plan = keyRow!.plan || "starter";
    return NextResponse.json({
      premium: true,
      plan,
      role_kind: ownedOrg ? "director" : "prof",
      seat_limit: ownedOrg?.seat_limit ?? null,
      max_students: plan === "starter" ? 45 : null,
      key: keyRow!.key,
      expires_at: keyRow!.expires_at,
      activated_at: keyRow!.used_at,
    });
  }

  // Pas de cle active : peut-etre un prof d'ecole -> il herite de
  // l'abonnement du directeur de son ecole.
  const { data: membership } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membership) {
    const { data: org } = await admin
      .from("organizations")
      .select("owner_id, name")
      .eq("id", membership.org_id)
      .maybeSingle();
    if (org) {
      const { data: dirKey } = await admin
        .from("activation_keys")
        .select("expires_at")
        .eq("used_by", org.owner_id)
        .order("used_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const dirActive =
        dirKey && (!dirKey.expires_at || new Date(dirKey.expires_at) >= new Date());
      if (dirActive) {
        return NextResponse.json({
          premium: true,
          plan: "pro",
          role_kind: "school_teacher",
          school_name: org.name,
          max_students: null,
          expires_at: dirKey!.expires_at,
        });
      }
    }
  }

  return NextResponse.json({
    premium: false,
    reason: "expired",
    expired_at: keyRow?.expires_at ?? null,
  });
}
