import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const level = searchParams.get("level")?.trim();

  let query = supabase
    .from("students")
    .select("*, group_members(count)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  if (level) {
    query = query.eq("level", level);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (data || []).map((s) => ({
    ...s,
    group_count: s.group_members?.[0]?.count ?? 0,
    group_members: undefined,
  }));

  return NextResponse.json(formatted);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { full_name, phone, parent_phone, level, section, notes, group_id, groups: groupAssignments } = body;

  if (!full_name?.trim() || !level?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      teacher_id: user.id,
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
      parent_phone: parent_phone?.trim() || null,
      level: level.trim(),
      section: section?.trim() || null,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(groupAssignments) && groupAssignments.length > 0) {
    for (const ga of groupAssignments) {
      if (!ga.group_id) continue;
      await supabase.from("group_members").insert({
        group_id: ga.group_id,
        student_id: student.id,
        enrolled_sessions: Array.isArray(ga.enrolled_sessions) && ga.enrolled_sessions.length > 0
          ? ga.enrolled_sessions
          : null,
      });
    }
  } else if (group_id) {
    await supabase.from("group_members").insert({
      group_id,
      student_id: student.id,
    });
  }

  return NextResponse.json(student);
}
