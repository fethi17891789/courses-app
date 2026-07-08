// Durees et prix des abonnements (hors app : paiement BaridiMob / CCP).
//
// Le prix reel vendu est ENREGISTRE sur chaque cle (colonne price_da) au moment
// de la creation : les stats de CA / MRR se basent sur ce prix stocke, jamais
// sur ces valeurs. Celles-ci ne servent qu'a PRE-REMPLIR le formulaire.
//
// >>> AJUSTE CES PRIX selon ta grille tarifaire reelle (en dinars). <<<

// Offres inde (starter/pro) + offres ecole (school_starter/school_pro).
// Ecole : la difference entre les deux offres = uniquement le nombre de profs
// autorises (sieges). Pas de limite d'eleves pour l'instant.
export type Plan = "starter" | "pro" | "school_starter" | "school_pro";
export type SchoolPlan = "school_starter" | "school_pro";
export type Duree = "mois" | "trimestre" | "annuel";

// 1 mois = 30 jours. Annuel inde = 270 jours (9 mois) ; il passe a 360 (12 mois)
// a la premiere inscription (bonus 3 mois, cf. signup). Annuel ECOLE = 360 jours
// direct (une ecole est ouverte toute l'annee), sans bonus -- voir durationDaysFor.
export const DUREES: Record<Duree, { days: number; label: string }> = {
  mois: { days: 30, label: "Mensuel" },
  trimestre: { days: 90, label: "Trimestriel" },
  annuel: { days: 270, label: "Annuel" },
};

export const PLAN_LABELS: Record<Plan, string> = {
  starter: "Starter (45 eleves)",
  pro: "Pro (illimite)",
  school_starter: "Ecole Starter (5 profs)",
  school_pro: "Ecole Pro (10 profs)",
};

// Nombre de profs (sieges) autorises par offre ecole.
export const SCHOOL_SEATS: Record<SchoolPlan, number> = {
  school_starter: 5,
  school_pro: 10,
};

// Prix par defaut en dinars (DA). Modifiables directement dans le formulaire.
export const DEFAULT_PRICES: Record<Plan, Record<Duree, number>> = {
  starter: { mois: 4000, trimestre: 10000, annuel: 25000 },
  pro: { mois: 8000, trimestre: 20000, annuel: 50000 },
  school_starter: { mois: 15000, trimestre: 40000, annuel: 150000 },
  school_pro: { mois: 30000, trimestre: 80000, annuel: 300000 },
};

export function isPlan(v: unknown): v is Plan {
  return v === "starter" || v === "pro" || v === "school_starter" || v === "school_pro";
}

export function isSchoolPlan(v: Plan): v is SchoolPlan {
  return v === "school_starter" || v === "school_pro";
}

export function isDuree(v: unknown): v is Duree {
  return v === "mois" || v === "trimestre" || v === "annuel";
}

/** Duree en jours d'une cle : l'annuel ecole vaut 12 mois pleins (360j). */
export function durationDaysFor(plan: Plan, duree: Duree): number {
  if (isSchoolPlan(plan) && duree === "annuel") {
    return 360;
  }
  return DUREES[duree].days;
}

/** Revenu mensuel normalise d'une cle (prix ramene a 30 jours). */
export function monthlyEquivalent(priceDa: number, durationDays: number): number {
  if (!priceDa || !durationDays) return 0;
  return (priceDa * 30) / durationDays;
}
