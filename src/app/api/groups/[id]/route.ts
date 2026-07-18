import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/admin-auth";
import { getSchoolScope } from "@/lib/school-scope";
import { NextResponse } from "next/server";
import { hasInternalConflict, findCrossGroupConflict } from "@/lib/schedule-conflict";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Directeur : acces a tout groupe de son ecole. Prof : le sien.
  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const { data: group, error } = await db
    .from("groups")
    .select("*")
    .eq("id", id)
    .in("teacher_id", teacherIds)
    .single();

  if (error || !group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: members } = await db
    .from("group_members")
    .select("*")
    .eq("group_id", id)
    .order("joined_at", { ascending: true });

  const { data: requests } = await db
    .from("join_requests")
    .select("*")
    .eq("group_id", id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return NextResponse.json({
    ...group,
    members: members || [],
    requests: requests || [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Le groupe doit appartenir a la portee (soi-meme, ou l'ecole pour un directeur).
  const { data: target } = await db
    .from("groups")
    .select("teacher_id")
    .eq("id", id)
    .in("teacher_id", teacherIds)
    .single();

  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.level !== undefined) updates.level = body.level.trim();
  if (body.section !== undefined) updates.section = body.section?.trim() || null;
  if (body.capacity !== undefined) updates.capacity = body.capacity;
  if (body.price !== undefined) updates.price = body.price;
  if (body.payment_mode !== undefined) updates.payment_mode = body.payment_mode;
  if (body.refund_absences !== undefined) updates.refund_absences = body.refund_absences;
  if (body.schedules !== undefined) updates.schedules = body.schedules;

  if (Array.isArray(body.schedules) && body.schedules.length > 0) {
    if (hasInternalConflict(body.schedules)) {
      return NextResponse.json({ error: "schedule_conflict" }, { status: 400 });
    }
    // Conflit verifie parmi les autres groupes du proprietaire du groupe.
    const { data: others } = await db
      .from("groups")
      .select("name, schedules")
      .eq("teacher_id", target.teacher_id)
      .neq("id", id);
    const conflictWith = findCrossGroupConflict(body.schedules, others || []);
    if (conflictWith) {
      return NextResponse.json(
        { error: "schedule_conflict", group: conflictWith },
        { status: 400 },
      );
    }
  }

  const { data, error } = await db
    .from("groups")
    .update(updates)
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const { error } = await db
    .from("groups")
    .delete()
    .eq("id", id)
    .in("teacher_id", teacherIds);

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
