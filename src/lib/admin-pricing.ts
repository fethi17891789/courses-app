// Durees et prix des abonnements (hors app : paiement BaridiMob / CCP).
//
// Le prix reel vendu est ENREGISTRE sur chaque cle (colonne price_da) au moment
// de la creation : les stats de CA / MRR se basent sur ce prix stocke, jamais
// sur ces valeurs. Celles-ci ne servent qu'a PRE-REMPLIR le formulaire.
//
// >>> AJUSTE CES PRIX selon ta grille tarifaire reelle (en dinars). <<<

export type Plan = "starter" | "pro";
export type Duree = "mois" | "trimestre" | "annuel";

// 1 mois = 30 jours. L'annuel = 270 jours (9 mois) ; il passe automatiquement a
// 360 jours (12 mois) a la premiere inscription (bonus 3 mois, cf. signup).
export const DUREES: Record<Duree, { days: number; label: string }> = {
  mois: { days: 30, label: "Mensuel" },
  trimestre: { days: 90, label: "Trimestriel" },
  annuel: { days: 270, label: "Annuel" },
};

export const PLAN_LABELS: Record<Plan, string> = {
  starter: "Starter (45 eleves)",
  pro: "Pro (illimite)",
};

// Prix par defaut en dinars (DA). Modifiables directement dans le formulaire.
export const DEFAULT_PRICES: Record<Plan, Record<Duree, number>> = {
  starter: { mois: 4000, trimestre: 10000, annuel: 25000 },
  pro: { mois: 8000, trimestre: 20000, annuel: 50000 },
};

export function isPlan(v: unknown): v is Plan {
  return v === "starter" || v === "pro";
}

export function isDuree(v: unknown): v is Duree {
  return v === "mois" || v === "trimestre" || v === "annuel";
}

/** Revenu mensuel normalise d'une cle (prix ramene a 30 jours). */
export function monthlyEquivalent(priceDa: number, durationDays: number): number {
  if (!priceDa || !durationDays) return 0;
  return (priceDa * 30) / durationDays;
}
