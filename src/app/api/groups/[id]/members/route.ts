import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { validateEnrolledSessions } from "@/lib/validate";

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

  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("group_members")
    .select("*, student:students(full_name, phone, level)")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(
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

  const { student_id, enrolled_sessions } = await request.json();

  if (!student_id) {
    return NextResponse.json({ error: "missing_student_id" }, { status: 400 });
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, capacity")
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { count } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (count !== null && count >= group.capacity) {
    return NextResponse.json({ error: "group_full" }, { status: 400 });
  }

  const insertData: Record<string, unknown> = { group_id: groupId, student_id };
  if (Array.isArray(enrolled_sessions) && enrolled_sessions.length > 0) {
    insertData.enrolled_sessions = enrolled_sessions;
  }

  const { data, error } = await supabase
    .from("group_members")
    .insert(insertData)
    .select("*, student:students(full_name, phone, level)")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_member" }, { status: 409 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data);
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

  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { memberId, enrolled_sessions } = await request.json();

  if (!memberId) {
    return NextResponse.json({ error: "missing_member_id" }, { status: 400 });
  }

  const sessionsError = validateEnrolledSessions(enrolled_sessions);
  if (sessionsError) {
    return NextResponse.json({ error: sessionsError }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("group_members")
    .update({
      enrolled_sessions: Array.isArray(enrolled_sessions) && enrolled_sessions.length > 0
        ? enrolled_sessions
        : null,
    })
    .eq("id", memberId)
    .eq("group_id", groupId)
    .select("*, student:students(full_name, phone, level)")
    .single();

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
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

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "missing_member_id" }, { status: 400 });
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: deleted, error } = await supabase
    .from("group_members")
    .delete()
    .eq("id", memberId)
    .eq("group_id", groupId)
    .select("student_id");

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  const studentId = deleted[0].student_id;
  if (studentId) {
    const { data: student } = await supabase
      .from("students")
      .select("auth_user_id")
      .eq("id", studentId)
      .single();

    if (student?.auth_user_id) {
      await supabase
        .from("join_requests")
        .delete()
        .eq("group_id", groupId)
        .eq("student_id", student.auth_user_id)
        .eq("status", "accepted");
    }

    const { count } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId);

    if (count === 0) {
      await supabase
        .from("students")
        .delete()
        .eq("id", studentId);
    }
  }

  return NextResponse.json({ success: true });
}
