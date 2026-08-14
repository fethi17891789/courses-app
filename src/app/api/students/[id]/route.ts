import { createClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-user";
import { getSupabaseAdmin } from "@/lib/admin-auth";
import { getSchoolScope } from "@/lib/school-scope";
import { NextResponse } from "next/server";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Portee : le prof peut ouvrir un eleve qu'il possede OU inscrit dans l'un de
  // ses groupes (eleve partage). Directeur : tout eleve de l'ecole.
  const scope = await getSchoolScope(user.id);
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("students")
    .select("*, group_members(id, group_id, enrolled_sessions, groups(name, level, schedules, price, payment_mode))")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Verifie l'acces : proprietaire dans la portee, ou inscrit dans un groupe
  // de la portee.
  let allowed = teacherIds.includes(data.teacher_id);
  if (!allowed) {
    const { data: scopeGroups } = await db
      .from("groups")
      .select("id")
      .in("teacher_id", teacherIds);
    const groupIds = (scopeGroups || []).map((g) => g.id);
    if (groupIds.length > 0) {
      const { count } = await db
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("student_id", id)
        .in("group_id", groupIds);
      allowed = (count ?? 0) > 0;
    }
  }
  if (!allowed) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: absences } = await db
    .from("attendance")
    .select("id, group_id, session_day, session_date, status, groups:group_id(name)")
    .eq("student_id", id)
    .eq("status", "absent")
    .order("session_date", { ascending: false })
    .limit(50);

  const { data: payments } = await db
    .from("payments")
    .select("id, group_id, amount, session_date, session_day, groups:group_id(name)")
    .eq("student_id", id)
    .order("session_date", { ascending: false })
    .limit(50);

  return NextResponse.json({ ...data, absences: absences || [], payments: payments || [] });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }



  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const body = await request.json();
  const { full_name, phone, parent_phone, level, section, notes, status } = body;

  const { data, error } = await db
    .from("students")
    .update({
      ...(full_name !== undefined && { full_name: full_name.trim() }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(parent_phone !== undefined && { parent_phone: parent_phone?.trim() || null }),
      ...(level !== undefined && { level: level.trim() }),
      ...(section !== undefined && { section: section?.trim() || null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(status !== undefined && { status }),
    })
    .eq("id", id)
    .in("teacher_id", teacherIds)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }



  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const { error } = await db
    .from("students")
    .delete()
    .eq("id", id)
    .in("teacher_id", teacherIds);

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
