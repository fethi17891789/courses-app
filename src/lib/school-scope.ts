import { getSupabaseAdmin } from "@/lib/admin-auth";

// Portee de lecture "ecole" pour un utilisateur.
//
// - Prof inde ou prof salarie : ne voit que SES donnees (isDirector = false).
//   Les routes gardent alors le client RLS habituel filtre sur teacher_id = self.
// - Directeur (proprietaire d'une organization) : voit les donnees de TOUS les
//   profs de son ecole (lui inclus, car il enseigne aussi). Les routes basculent
//   sur le client service-role filtre par `.in("teacher_id", teacherIds)`.
//
// PERF : getSchoolScope ne fait QUE des requetes d'identifiants (2 requetes max,
// aucune resolution de nom). C'est ce que 99% des routes consomment
// (scope.isDirector + scope.teacherIds). La resolution des NOMS des profs (via
// auth.admin.getUserById, couteuse) est isolee dans getSchoolTeachers et n'est
// appelee QUE la ou on affiche les badges/filtre (/api/school + hook client).

export type SchoolTeacher = { id: string; name: string; is_self: boolean };

export type SchoolScope = {
  isDirector: boolean;
  // [self, ...membres actifs] pour un directeur ; [] sinon.
  teacherIds: string[];
};

const NOT_DIRECTOR: SchoolScope = { isDirector: false, teacherIds: [] };

// Identifiants uniquement (rapide). A utiliser partout ou l'on n'affiche pas les
// noms des profs.
export async function getSchoolScope(userId: string): Promise<SchoolScope> {
  const admin = getSupabaseAdmin();

  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!org) return NOT_DIRECTOR;

  const { data: members } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("org_id", org.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  const ids = [userId, ...(members ?? []).map((m) => m.user_id)];
  return { isDirector: true, teacherIds: ids };
}

// Portee + noms des profs (pour les badges + le filtre "par prof"). Les appels
// getUserById sont faits EN PARALLELE (Promise.all) pour eviter le N+1 sequentiel.
export async function getSchoolTeachers(
  userId: string,
): Promise<SchoolScope & { teachers: SchoolTeacher[] }> {
  const scope = await getSchoolScope(userId);
  if (!scope.isDirector) return { ...scope, teachers: [] };

  const admin = getSupabaseAdmin();
  const teachers = await Promise.all(
    scope.teacherIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      const name =
        (data?.user?.user_metadata?.full_name as string | undefined) ||
        data?.user?.email ||
        "";
      return { id, name, is_self: id === userId };
    }),
  );

  return { ...scope, teachers };
}
