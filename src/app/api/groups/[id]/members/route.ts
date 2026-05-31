import { createClient } from "@/lib/supabase-server";
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  // Get the student_id before deleting, to clean up the join_request
  const { data: member } = await supabase
    .from("group_members")
    .select("student_id")
    .eq("id", memberId)
    .eq("group_id", groupId)
    .maybeSingle();

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (member?.student_id) {
    // Clean up any accepted join_request so the student can re-request
    await supabase
      .from("join_requests")
      .delete()
      .eq("group_id", groupId)
      .eq("status", "accepted");

    // If the student is no longer in any group, delete the student record
    const { count: otherGroups } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("student_id", member.student_id);

    if (otherGroups === 0) {
      await supabase
        .from("students")
        .delete()
        .eq("id", member.student_id);
    }
  }

  return NextResponse.json({ success: true });
}
