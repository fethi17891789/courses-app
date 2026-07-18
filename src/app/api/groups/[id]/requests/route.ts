import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/admin-auth";
import { getSchoolScope } from "@/lib/school-scope";
import { NextResponse } from "next/server";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    .select("id, level, section, teacher_id")
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

  const { error: updateError } = await db
    .from("join_requests")
    .update({
      status: action === "accept" ? "accepted" : "rejected",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (action === "accept") {
    // Limite gratuite (45 eleves) : uniquement pour un prof inde en starter.
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

  return NextResponse.json({ success: true });
}
