import { NextResponse } from "next/server";
import { requireOwner, getSupabaseAdmin } from "@/lib/admin-auth";
import { generateActivationKey } from "@/lib/activation-key";
import { hashKey } from "@/lib/hash-key";
import { isPlan, isDuree, isSchoolPlan, durationDaysFor, SCHOOL_SEATS } from "@/lib/admin-pricing";

export const runtime = "nodejs";

// Liste des dernieres cles (metadonnees uniquement : la cle en clair n'existe
// qu'une seule fois, a la creation).
export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("activation_keys")
    .select("id, plan, duration_days, price_da, is_test, used_by, used_at, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });

  const now = new Date();
  const keys = (data ?? []).map((k) => ({
    id: k.id,
    plan: k.plan,
    duration_days: k.duration_days,
    price_da: k.price_da,
    is_test: k.is_test,
    used: !!k.used_by,
    used_at: k.used_at,
    expires_at: k.expires_at,
    created_at: k.created_at,
    expired: !!(k.expires_at && new Date(k.expires_at) < now),
  }));

  return NextResponse.json({ keys });
}

// Creation d'une cle (test ou officielle).
export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { plan, duree, isTest } = body;
  if (!isPlan(plan) || !isDuree(duree)) {
    return NextResponse.json({ error: "invalid_plan_or_duree" }, { status: 400 });
  }

  const isTestKey = isTest === true;
  const durationDays = durationDaysFor(plan, duree);
  // Cle ecole : on fige le nombre de profs autorises (sieges) sur la cle.
  const seatLimit = isSchoolPlan(plan) ? SCHOOL_SEATS[plan] : null;

  // Prix : 0 pour une cle test (jamais comptee dans le CA). Pour une cle
  // officielle, on prend le prix envoye par le formulaire (entier >= 0).
  let priceDa = 0;
  if (!isTestKey) {
    const raw = Number(body.priceDa);
    if (!Number.isFinite(raw) || raw < 0) {
      return NextResponse.json({ error: "invalid_price" }, { status: 400 });
    }
    priceDa = Math.round(raw);
  }

  const plainKey = generateActivationKey();
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("activation_keys").insert({
    key: hashKey(plainKey),
    plan,
    duration_days: durationDays,
    is_test: isTestKey,
    price_da: priceDa,
    seat_limit: seatLimit,
  });

  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });

  return NextResponse.json({ key: plainKey, plan, duration_days: durationDays, is_test: isTestKey, price_da: priceDa, seat_limit: seatLimit });
}
