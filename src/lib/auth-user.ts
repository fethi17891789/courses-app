import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";

/**
 * Sous-ensemble de `User` reellement utilise dans l'application, reconstruit
 * depuis les claims du JWT.
 *
 * PERF : `auth.getUser()` interroge le serveur Auth de Supabase A CHAQUE APPEL
 * (~180 ms d'aller-retour). `auth.getClaims()` verifie la signature du JWT
 * LOCALEMENT via WebCrypto quand le projet utilise des cles de signature
 * asymetriques -> 0 appel reseau. La securite est identique : le token est
 * verifie cryptographiquement, on ne fait pas confiance au cookie brut.
 *
 * Le `cache()` de React deduplique en plus les appels a l'interieur d'une meme
 * requete serveur (layout + page + route handler = une seule verification).
 */
export type AuthUser = Pick<
  User,
  "id" | "email" | "user_metadata" | "app_metadata"
>;

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) return null;

  const claims = data.claims;

  return {
    id: claims.sub,
    email: claims.email,
    user_metadata: claims.user_metadata ?? {},
    app_metadata: claims.app_metadata ?? {},
  };
});

/** Role applicatif du compte connecte (prof par defaut). */
export async function getAuthRole(): Promise<string | null> {
  const user = await getAuthUser();
  if (!user) return null;
  return (user.user_metadata?.role as string | undefined) || "prof";
}
