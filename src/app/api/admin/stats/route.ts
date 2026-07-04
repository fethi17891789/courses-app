import { NextResponse } from "next/server";
import { requireOwner, getSupabaseAdmin } from "@/lib/admin-auth";
import { monthlyEquivalent } from "@/lib/admin-pricing";

export const runtime = "nodejs";

type KeyRow = {
  plan: string | null;
  duration_days: number | null;
  price_da: number | null;
  is_test: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const days30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const days7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // --- Cles / ventes ---------------------------------------------------------
  const { data: allKeys } = await admin
    .from("activation_keys")
    .select("plan, duration_days, price_da, is_test, used_by, used_at, expires_at, created_at");

  const keys = (allKeys ?? []) as KeyRow[];
  const real = keys.filter((k) => !k.is_test); // les cles test n'entrent JAMAIS dans les stats

  const isActive = (k: KeyRow) =>
    !!k.used_by && (!k.expires_at || new Date(k.expires_at) > now);

  const activeKeys = real.filter(isActive);
  const activePro = activeKeys.filter((k) => k.plan === "pro").length;
  const activeStarter = activeKeys.filter((k) => k.plan !== "pro").length;

  const expiringSoon = activeKeys.filter(
    (k) => k.expires_at && new Date(k.expires_at) <= in7d,
  ).length;

  const newActivationsMonth = real.filter(
    (k) => k.used_at && new Date(k.used_at) >= startOfMonth,
  ).length;

  const unusedKeys = real.filter((k) => !k.used_by);
  const unusedCount = unusedKeys.length;
  const unusedValue = unusedKeys.reduce((s, k) => s + (k.price_da ?? 0), 0);

  // Churn : profs dont la cle la plus recente est expiree (non renouvelee).
  const latestByUser = new Map<string, KeyRow>();
  for (const k of real) {
    if (!k.used_by) continue;
    const prev = latestByUser.get(k.used_by);
    const t = k.used_at ? new Date(k.used_at).getTime() : 0;
    const pt = prev?.used_at ? new Date(prev.used_at).getTime() : -1;
    if (!prev || t > pt) latestByUser.set(k.used_by, k);
  }
  let churn = 0;
  for (const k of latestByUser.values()) {
    if (k.expires_at && new Date(k.expires_at) < now) churn++;
  }

  // Revenus (bases sur le prix reellement enregistre sur chaque cle).
  const caMonth = real
    .filter((k) => new Date(k.created_at) >= startOfMonth)
    .reduce((s, k) => s + (k.price_da ?? 0), 0);
  const caTotal = real.reduce((s, k) => s + (k.price_da ?? 0), 0);
  const mrr = Math.round(
    activeKeys.reduce(
      (s, k) => s + monthlyEquivalent(k.price_da ?? 0, k.duration_days ?? 0),
      0,
    ),
  );

  // --- Utilisateurs ----------------------------------------------------------
  let profs = 0;
  let eleves = 0;
  let parents = 0;
  let newProfs7d = 0;
  let newProfs30d = 0;
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const batch = data?.users ?? [];
    for (const u of batch) {
      const role = (u.user_metadata?.role as string) || "prof";
      if (role === "eleve") eleves++;
      else if (role === "parent") parents++;
      else {
        profs++;
        const created = u.created_at ? new Date(u.created_at) : null;
        if (created && created >= days7ago) newProfs7d++;
        if (created && created >= days30ago) newProfs30d++;
      }
    }
    if (batch.length < 200) break;
  }

  // --- Activite / viralite ---------------------------------------------------
  const [{ count: groups }, { count: students }, { count: referralsTotal }, { count: referralsMonth }] =
    await Promise.all([
      admin.from("groups").select("id", { count: "exact", head: true }),
      admin.from("students").select("id", { count: "exact", head: true }),
      admin.from("referrals").select("id", { count: "exact", head: true }),
      admin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString()),
    ]);

  return NextResponse.json({
    sales: {
      activeTotal: activeKeys.length,
      activePro,
      activeStarter,
      newActivationsMonth,
      expiringSoon,
      churn,
      unusedCount,
      unusedValue,
    },
    revenue: { caMonth, caTotal, mrr },
    users: {
      profs,
      eleves,
      parents,
      newProfs7d,
      newProfs30d,
    },
    activity: {
      groups: groups ?? 0,
      students: students ?? 0,
      referralsTotal: referralsTotal ?? 0,
      referralsMonth: referralsMonth ?? 0,
    },
  });
}
