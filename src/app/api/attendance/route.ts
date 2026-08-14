import { createClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-user";
import { getSupabaseAdmin } from "@/lib/admin-auth";
import { getSchoolScope } from "@/lib/school-scope";
import { sendPushNotification } from "@/lib/onesignal";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Previens l'eleve qu'il vient d'etre marque absent.
 *
 * `student_id` designe la FICHE eleve, pas son compte : il faut resoudre
 * `auth_user_id`, qui reste vide tant que l'eleve n'a pas rejoint via un compte.
 * Dans ce cas il n'y a personne a notifier et on s'arrete la.
 */
async function notifyAbsence(
  db: SupabaseClient,
  groupId: string,
  studentId: string,
) {
  const [{ data: student }, { data: group }] = await Promise.all([
    db.from("students").select("auth_user_id").eq("id", studentId).maybeSingle(),
    db.from("groups").select("name").eq("id", groupId).maybeSingle(),
  ]);

  if (!student?.auth_user_id) return;

  await sendPushNotification({
    title: "Absence enregistree",
    message: group?.name
      ? `Tu as ete marque absent au cours de ${group.name}`
      : "Tu as ete marque absent au cours d'aujourd'hui",
    userIds: [student.auth_user_id],
    data: { type: "absence", group_id: groupId },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { group_id, student_id, session_day, status, paid, amount } = body;
  const session_time = typeof body.session_time === "string" ? body.session_time : "";

  if (!group_id || !student_id || session_day === undefined || !status) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Directeur : peut faire l'appel sur tout groupe de l'ecole. L'enregistrement
  // reste rattache au prof proprietaire du groupe (ownerId) pour qu'il le voie.
  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  let ownerId = user.id;
  if (scope.isDirector) {
    const { data: g } = await db
      .from("groups")
      .select("teacher_id")
      .eq("id", group_id)
      .in("teacher_id", scope.teacherIds)
      .single();
    if (!g) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    ownerId = g.teacher_id;
  }

  const today = new Date().toISOString().split("T")[0];

  // On lit aussi le statut precedent : il sert a ne notifier que lorsque
  // l'eleve DEVIENT absent, et pas a chaque correction du prof.
  const { data: existing } = await db
    .from("attendance")
    .select("id, status")
    .eq("group_id", group_id)
    .eq("student_id", student_id)
    .eq("session_date", today)
    .eq("session_day", session_day)
    .eq("session_time", session_time)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from("attendance")
      .update({ status })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  } else {
    const { error } = await db
      .from("attendance")
      .insert({
        group_id,
        student_id,
        teacher_id: ownerId,
        session_day,
        session_time,
        session_date: today,
        status,
      });

    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  // Notification d'absence a l'eleve.
  //
  // Uniquement au PASSAGE a "absent" : si le prof corrige une erreur puis
  // remarque absent, l'eleve n'est pas notifie deux fois.
  //
  // Volontairement en arriere-plan (pas de `await`) : l'appel se fait au doigt,
  // seance apres seance, et ne doit jamais attendre un aller-retour OneSignal.
  //
  // TODO parent : quand l'espace parent existera, notifier aussi le parent
  // rattache. Aujourd'hui la fiche eleve n'a qu'un `parent_phone` (du texte),
  // aucun compte parent n'y est lie.
  if (status === "absent" && existing?.status !== "absent") {
    notifyAbsence(db, group_id, student_id).catch(() => {});
  }

  if (paid && amount > 0) {
    const { data: existingPayment } = await db
      .from("payments")
      .select("id")
      .eq("group_id", group_id)
      .eq("student_id", student_id)
      .eq("session_date", today)
      .eq("session_day", session_day)
      .eq("session_time", session_time)
      .maybeSingle();

    if (!existingPayment) {
      await db.from("payments").insert({
        group_id,
        student_id,
        teacher_id: ownerId,
        amount,
        session_date: today,
        session_day,
        session_time,
      });
    }
  }

  return NextResponse.json({ success: true });
}
