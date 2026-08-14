/**
 * Cache court du verrou d'abonnement, cote middleware.
 *
 * PERF : le middleware appelait `has_active_access` sur CHAQUE navigation, soit
 * un aller-retour Supabase bloquant (~180 ms) avant meme de commencer le rendu.
 * Un abonnement ne change pas d'etat plusieurs fois par minute : on memorise le
 * resultat dans un cookie signe pendant 10 minutes.
 *
 * SECURITE : le cookie est signe en HMAC-SHA256 et lie a l'identifiant du
 * compte, donc il ne peut etre ni forge ni reutilise sur un autre compte. Le
 * pire cas est qu'un abonnement expire reste valide au maximum 10 minutes de
 * plus, ce qui est sans consequence (le paiement est manuel et annuel).
 *
 * Compatible Edge Runtime : uniquement WebCrypto, aucune dependance Node.
 */

export const ACCESS_COOKIE = "access-check";

const TTL_SECONDS = 600; // 10 minutes

function getSecret(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparaison a temps constant, pour ne pas fuiter la signature attendue. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Le cookie atteste-t-il que ce compte precis a un acces actif, et est-il
 * encore dans sa fenetre de validite ? Toute anomalie renvoie `false`, ce qui
 * declenche simplement une revalidation complete (fail-closed).
 */
export async function readAccessCookie(
  raw: string | undefined,
  userId: string,
): Promise<boolean> {
  const secret = getSecret();
  if (!raw || !secret) return false;

  const [sub, expiresAt, signature] = raw.split(".");
  if (!sub || !expiresAt || !signature) return false;

  if (sub !== userId) return false;
  if (Number(expiresAt) < Date.now()) return false;

  const expected = await sign(`${sub}.${expiresAt}`, secret);
  return safeEqual(signature, expected);
}

/** Valeur a poser dans le cookie apres une verification reussie. */
export async function buildAccessCookie(userId: string): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;

  const expiresAt = Date.now() + TTL_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TTL_SECONDS,
};
