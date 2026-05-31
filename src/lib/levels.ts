export type LevelCategory = "primaire" | "moyen" | "lycee";

export type LevelDef = {
  id: string;
  label: string;
  category: LevelCategory;
  sections?: string[];
};

export const levels: LevelDef[] = [
  { id: "1AP", label: "1AP", category: "primaire" },
  { id: "2AP", label: "2AP", category: "primaire" },
  { id: "3AP", label: "3AP", category: "primaire" },
  { id: "4AP", label: "4AP", category: "primaire" },
  { id: "5AP", label: "5AP", category: "primaire" },
  { id: "1AM", label: "1AM", category: "moyen" },
  { id: "2AM", label: "2AM", category: "moyen" },
  { id: "3AM", label: "3AM", category: "moyen" },
  { id: "4AM", label: "4AM (BEM)", category: "moyen" },
  { id: "1AS", label: "1AS", category: "lycee", sections: ["Sciences", "Lettres"] },
  { id: "2AS", label: "2AS", category: "lycee", sections: ["Sc. Exp", "Maths", "Tech Maths", "Gestion-Economie", "Lettres et Philo", "Langues Etrangeres"] },
  { id: "3AS", label: "3AS (BAC)", category: "lycee", sections: ["Sc. Exp", "Maths", "Tech Maths", "Gestion-Economie", "Lettres et Philo", "Langues Etrangeres"] },
];

export const categoryLabels: Record<LevelCategory, { fr: string; ar: string }> = {
  primaire: { fr: "Primaire", ar: "ابتدائي" },
  moyen: { fr: "Moyen (CEM)", ar: "متوسط" },
  lycee: { fr: "Lycee", ar: "ثانوي" },
};

export function getLevelDef(id: string): LevelDef | undefined {
  return levels.find((l) => l.id === id);
}

export function hasSections(levelId: string): boolean {
  const def = getLevelDef(levelId);
  return !!def?.sections?.length;
}
