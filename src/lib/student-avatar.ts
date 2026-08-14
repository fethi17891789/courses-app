/**
 * Avatars d'eleves : tirage deterministe a partir de l'identifiant.
 *
 * Aucune colonne en base, aucune migration : le meme eleve retombe toujours sur
 * le meme personnage, sur tous les appareils, y compris pour les eleves deja
 * existants. Si un jour on veut laisser le prof CHOISIR l'avatar, il suffira
 * d'ajouter une colonne optionnelle qui prend le dessus sur ce tirage.
 */

/** Hachage FNV-1a 32 bits : rapide, stable, meme resultat partout. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type AvatarPalette = {
  /** Fond de la vignette. */
  bg: string;
  /** Masse principale des cheveux. */
  hair: string;
  /** Meches / ombres, plus foncees. */
  hairDark: string;
  /** Meches claires, pour les reflets. */
  hairLight: string;
};

/** Teintes de cheveux plausibles, du blond au noir. */
export const PALETTES: AvatarPalette[] = [
  { bg: "#E2571E", hair: "#C2410C", hairDark: "#8F2F09", hairLight: "#F2803F" }, // roux
  { bg: "#D9A566", hair: "#C08B4A", hairDark: "#9A6C36", hairLight: "#EAC38C" }, // blond
  { bg: "#3B2318", hair: "#2A1810", hairDark: "#170C07", hairLight: "#5C3A28" }, // brun fonce
  { bg: "#1C1917", hair: "#0C0A09", hairDark: "#000000", hairLight: "#3F3B39" }, // noir
  { bg: "#8B5E3C", hair: "#6B4426", hairDark: "#4A2E18", hairLight: "#A97C54" }, // chatain
  { bg: "#7F1D3A", hair: "#5C142A", hairDark: "#3D0C1B", hairLight: "#A03354" }, // bordeaux
  { bg: "#2B3A9E", hair: "#1E2A78", hairDark: "#141C55", hairLight: "#4553C4" }, // bleu
  { bg: "#A16207", hair: "#854D0E", hairDark: "#5C3506", hairLight: "#CA8A04" }, // miel
];

export type HairStyle = "long" | "short" | "wavy" | "bob";
export const HAIR_STYLES: HairStyle[] = ["long", "short", "wavy", "bob"];

export type Accessory = "none" | "flower" | "bow" | "heart" | "star" | "clips";
export const ACCESSORIES: Accessory[] = [
  "none",
  "flower",
  "bow",
  "heart",
  "star",
  "clips",
];

export type AvatarConfig = {
  palette: AvatarPalette;
  hairStyle: HairStyle;
  accessory: Accessory;
  /** Decalage du cycle d'expressions, pour que les avatars ne soient pas synchrones. */
  delay: number;
};

/**
 * Configuration stable d'un eleve. On derive plusieurs choix independants du
 * meme hachage en le decalant, ce qui evite que deux eleves de la meme couleur
 * aient aussi la meme coiffure.
 */
export function getAvatarConfig(seed: string): AvatarConfig {
  const h = hash(seed);

  return {
    palette: PALETTES[h % PALETTES.length],
    hairStyle: HAIR_STYLES[(h >>> 5) % HAIR_STYLES.length],
    accessory: ACCESSORIES[(h >>> 11) % ACCESSORIES.length],
    // 0 a 9.5 s : etale le depart du cycle sur toute sa duree
    delay: ((h >>> 17) % 20) / 2,
  };
}
