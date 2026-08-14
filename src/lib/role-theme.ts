/**
 * Palette par profil, partagee par l'ecran de login, la modale de consentement
 * et la page /legal.
 *
 * Elle vivait uniquement dans login-screen.tsx : les ecrans legaux affichaient
 * donc toujours du violet, meme pour un eleve ou un parent. Elle est extraite
 * ici pour qu'il n'existe qu'une seule definition des couleurs de profil.
 */

export type Role = "prof" | "eleve" | "parent";

export type Theme = {
  primary: string;
  gradientFrom: string;
  gradientTo: string;
  shadow3d: string;
  shadowGlow: string;
  bgTint: string;
  inputBorder: string;
  inputBg: string;
  focusRing: string;
};

export const themes: Record<Role, Theme> = {
  prof: {
    primary: "#7c3aed",
    gradientFrom: "#8b5cf6",
    gradientTo: "#6d28d9",
    shadow3d: "#5b21b6",
    shadowGlow: "rgba(124,58,237,0.5)",
    bgTint: "#f5f3ff",
    inputBorder: "#ddd6fe",
    inputBg: "#f9f7ff",
    focusRing: "rgba(124,58,237,0.12)",
  },
  eleve: {
    primary: "#22c55e",
    gradientFrom: "#4ade80",
    gradientTo: "#16a34a",
    shadow3d: "#15803d",
    shadowGlow: "rgba(34,197,94,0.5)",
    bgTint: "#f0fdf4",
    inputBorder: "#bbf7d0",
    inputBg: "#f7fef9",
    focusRing: "rgba(34,197,94,0.12)",
  },
  parent: {
    primary: "#f97316",
    gradientFrom: "#fb923c",
    gradientTo: "#ea580c",
    shadow3d: "#c2410c",
    shadowGlow: "rgba(249,115,22,0.5)",
    bgTint: "#fff7ed",
    inputBorder: "#fed7aa",
    inputBg: "#fffaf5",
    focusRing: "rgba(249,115,22,0.12)",
  },
};

/** Profil valide, avec repli sur "prof" pour toute valeur inconnue. */
export function toRole(value: string | null | undefined): Role {
  return value === "eleve" || value === "parent" ? value : "prof";
}
