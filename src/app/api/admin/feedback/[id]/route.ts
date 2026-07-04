import { NextResponse } from "next/server";
import { requireOwner, getSupabaseAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const STATUSES = ["new", "reviewed", "rewarded", "dismissed"];

// Traiter un feedback : changer son statut et, optionnellement, offrir un bonus
// (en jours) au prof qui l'a signale -> prolonge son abonnement et passe le
// statut a "rewarded".
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const bonusDays = Math.round(Number(body.bonusDays) || 0);

  // Cas 1 : bonus -> prolonge l'abonnement du prof signaleur.
  if (bonusDays > 0) {
    const { data: fb } = await admin
      .from("feedback")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!fb?.user_id) {
      return NextResponse.json({ error: "no_user" }, { status: 400 });
    }

    const { data: keyRow } = await admin
      .from("activation_keys")
      .select("id, expires_at")
      .eq("used_by", fb.user_id)
      .order("used_at", { ascending: false })
      .limit(1)
      .single();

    if (!keyRow) {
      return NextResponse.json({ error: "no_subscription" }, { status: 400 });
    }

    const now = new Date();
    const base =
      keyRow.expires_at && new Date(keyRow.expires_at) > now
        ? new Date(keyRow.expires_at)
        : now;
    const newExpiry = new Date(
      base.getTime() + bonusDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    await admin
      .from("activation_keys")
      .update({ expires_at: newExpiry })
      .eq("id", keyRow.id);

    await admin.from("feedback").update({ status: "rewarded" }).eq("id", id);

    return NextResponse.json({ success: true, status: "rewarded", new_expiry: newExpiry });
  }

  // Cas 2 : simple changement de statut.
  const status = body.status;
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const { error } = await admin.from("feedback").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });

  return NextResponse.json({ success: true, status });
}
