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
    .from("join_requests")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const body = await request.json();
  const { requestId, action } = body;

  if (!requestId || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, level, section")
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: req } = await supabase
    .from("join_requests")
    .select("*")
    .eq("id", requestId)
    .eq("group_id", groupId)
    .eq("status", "pending")
    .single();

  if (!req) {
    return NextResponse.json({ error: "request_not_found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
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
    const studentName = req.student_name || "Eleve";
    const studentPhone = req.phone || null;
    const studentParentPhone = req.parent_phone || null;
    const studentLevel = req.level || group.level;
    const studentSection = req.section || group.section;
    const studentNotes = req.notes || null;

    const authUserId = req.student_id;

    let studentRecord = await supabase
      .from("students")
      .select("id")
      .eq("teacher_id", user.id)
      .eq("full_name", studentName)
      .single();

    let studentId: string;

    if (studentRecord.data) {
      studentId = studentRecord.data.id;
      await supabase
        .from("students")
        .update({ auth_user_id: authUserId })
        .eq("id", studentId);
    } else {
      const { data: newStudent, error: studentError } = await supabase
        .from("students")
        .insert({
          teacher_id: user.id,
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

    const { error: memberError } = await supabase
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
