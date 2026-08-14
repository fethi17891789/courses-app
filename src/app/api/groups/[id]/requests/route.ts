import { createClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-user";
import { getSupabaseAdmin } from "@/lib/admin-auth";
import { getSchoolScope } from "@/lib/school-scope";
import { sendPushNotification } from "@/lib/onesignal";
import { NextResponse } from "next/server";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const { data: group } = await db
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .in("teacher_id", teacherIds)
    .single();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data, error } = await db
    .from("join_requests")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const body = await request.json();
  const { requestId, action } = body;

  if (!requestId || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { data: group } = await db
    .from("groups")
    .select("id, name, level, section, teacher_id")
    .eq("id", groupId)
    .in("teacher_id", teacherIds)
    .single();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // L'eleve cree est rattache au prof proprietaire du groupe (pas au directeur).
  const ownerId = group.teacher_id;

  const { data: req } = await db
    .from("join_requests")
    .select("*")
    .eq("id", requestId)
    .eq("group_id", groupId)
    .eq("status", "pending")
    .single();

  if (!req) {
    return NextResponse.json({ error: "request_not_found" }, { status: 404 });
  }

  // ORDRE IMPORTANT : la demande n'est marquee resolue qu'APRES que tout le
  // reste a reussi.
  //
  // Avant, elle passait a "acceptee" en premier. Si la suite echouait -- quota
  // Starter atteint, creation de la fiche eleve, inscription au groupe -- la
  // demande restait "acceptee" sans qu'aucun eleve ne soit inscrit. Comme la
  // liste n'affiche que les demandes "pending", elle disparaissait de l'ecran
  // du prof, qui ne pouvait plus la retraiter, et l'eleve n'etait jamais
  // inscrit ni prevenu.
  if (action === "accept") {
    // Limite du plan Starter (45 eleves) : uniquement pour un prof independant.
    // Un compte ecole (directeur ou prof salarie) n'est jamais limite.
    const plan = user.user_metadata?.plan || "starter";
    if (!scope.isDirector && plan === "starter") {
      const { count } = await db
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", ownerId);

      if ((count ?? 0) >= 45) {
        return NextResponse.json({ error: "student_limit_reached" }, { status: 403 });
      }
    }
    const studentName = req.student_name || "Eleve";
    const studentPhone = req.phone || null;
    const studentParentPhone = req.parent_phone || null;
    const studentLevel = req.level || group.level;
    const studentSection = req.section || group.section;
    const studentNotes = req.notes || null;

    const authUserId = req.student_id;

    const studentRecord = await db
      .from("students")
      .select("id")
      .eq("teacher_id", ownerId)
      .eq("full_name", studentName)
      .single();

    let studentId: string;

    if (studentRecord.data) {
      studentId = studentRecord.data.id;
      await db
        .from("students")
        .update({ auth_user_id: authUserId })
        .eq("id", studentId);
    } else {
      const { data: newStudent, error: studentError } = await db
        .from("students")
        .insert({
          teacher_id: ownerId,
          full_name: studentName,
          phone: studentPhone,
          parent_phone: studentParentPhone,
          level: studentLevel,
          section: studentSection,
          notes: studentNotes,
          auth_user_id: authUserId,
        })
        .select("id")
        .single();

      if (studentError || !newStudent) {
        return NextResponse.json({ error: studentError?.message || "student_create_failed" }, { status: 500 });
      }
      studentId = newStudent.id;
    }

    const enrolledSessions = Array.isArray(req.selected_schedules) && req.selected_schedules.length > 0
      ? req.selected_schedules
      : null;

    const { error: memberError } = await db
      .from("group_members")
      .insert({
        group_id: groupId,
        student_id: studentId,
        status: "active",
        enrolled_sessions: enrolledSessions,
      });

    if (memberError && memberError.code !== "23505") {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }
  }

  // L'eleve est bien inscrit : la demande peut etre resolue.
  //
  // ECRITURE EN SERVICE-ROLE, VOLONTAIREMENT. L'autorisation est deja verifiee
  // plus haut (le groupe doit appartenir a la portee du prof). Passer par le
  // client RLS etait dangereux ici : quand la politique d'ecriture manque,
  // PostgreSQL ne renvoie AUCUNE erreur, il modifie zero ligne. La demande
  // restait donc "pending", la notification partait quand meme, et le sondage
  // du prof la faisait reapparaitre -- il recliquait, et l'eleve recevait une
  // notification a chaque fois. Meme raison que dans /api/join/[code].
  //
  // `.select()` garantit qu'on voit reellement la ligne modifiee : sans lui,
  // une ecriture sans effet reste indetectable.
  const { data: resolved, error: updateError } = await getSupabaseAdmin()
    .from("join_requests")
    .update({
      status: action === "accept" ? "accepted" : "rejected",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Aucune ligne touchee : la demande a deja ete traitee entre-temps (double
  // clic, second onglet). On ne notifie pas une deuxieme fois.
  if (!resolved) {
    return NextResponse.json({ error: "request_not_found" }, { status: 409 });
  }

  // Previens l'eleve de la reponse. Sans ca, le prof est notifie de la demande
  // mais l'eleve doit rouvrir l'application pour deviner s'il a ete accepte.
  // `student_id` est l'identifiant du COMPTE de l'eleve : il est absent si la
  // demande a ete faite sans compte, auquel cas il n'y a personne a notifier.
  if (req.student_id) {
    const accepted = action === "accept";
    sendPushNotification({
      title: accepted ? "Demande acceptee" : "Demande refusee",
      message: accepted
        ? `Tu fais maintenant partie du groupe ${group.name}`
        : `Ta demande pour le groupe ${group.name} n'a pas ete retenue`,
      userIds: [req.student_id],
      data: {
        type: accepted ? "join_accepted" : "join_rejected",
        group_id: groupId,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
