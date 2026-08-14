import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getAuthUser, type AuthUser } from "@/lib/auth-user";

/**
 * Verrou d'acces au poste de pilotage (/admin).
 *
 * L'unique proprietaire autorise est defini par la variable d'environnement
 * ADMIN_EMAIL (jamais exposee au client : pas de prefixe NEXT_PUBLIC). Si elle
 * n'est pas definie, PERSONNE n'est proprietaire -> l'admin est inaccessible
 * (fail-closed). L'obscurite de l'URL n'est PAS une protection : la vraie
 * securite est cette verification cote serveur, appliquee a la page ET a chaque
 * route API admin (defense en profondeur).
 */
export function isOwnerEmail(email: string | null | undefined): boolean {
  const owner = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!owner || !email) return false;
  return email.trim().toLowerCase() === owner;
}

export function isOwner(user: AuthUser | null | undefined): boolean {
  return isOwnerEmail(user?.email);
}

/**
 * A utiliser au debut de chaque route API admin. Retourne l'utilisateur si
 * (et seulement si) c'est le proprietaire connecte, sinon null.
 */
export async function requireOwner(): Promise<AuthUser | null> {
  const user = await getAuthUser();
  return isOwner(user) ? user : null;
}

/** Client Supabase avec la cle service-role (serveur uniquement). */
export function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
