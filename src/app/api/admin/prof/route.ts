import { NextResponse } from "next/server";
import { requireOwner, getSupabaseAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Recherche un prof par email et renvoie UNIQUEMENT ses infos d'abonnement
// (plan, expiration, actif). JAMAIS de donnees sur ses eleves.
export async function GET(request: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "missing_email" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Trouver l'utilisateur par email (pas de getUserByEmail dans le SDK admin).
  let match: { id: string; email?: string; role: string } | null = null;
  for (let page = 1; page <= 20 && !match; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const batch = data?.users ?? [];
    for (const u of batch) {
      if (u.email?.toLowerCase() === email) {
        match = {
          id: u.id,
          email: u.email,
          role: (u.user_metadata?.role as string) || "prof",
        };
        break;
      }
    }
    if (batch.length < 200) break;
  }

  if (!match) return NextResponse.json({ found: false });

  const { data: keyRow } = await admin
    .from("activation_keys")
    .select("plan, expires_at, used_at")
    .eq("used_by", match.id)
    .order("used_at", { ascending: false })
    .limit(1)
    .single();

  const now = new Date();
  const active = !!keyRow && (!keyRow.expires_at || new Date(keyRow.expires_at) > now);

  return NextResponse.json({
    found: true,
    email: match.email,
    role: match.role,
    plan: keyRow?.plan ?? null,
    expires_at: keyRow?.expires_at ?? null,
    activated_at: keyRow?.used_at ?? null,
    active,
  });
}
