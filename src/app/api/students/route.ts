import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { validateString, validatePhone, validateEnrolledSessions, firstError } from "@/lib/validate";

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

  if (search && search.length <= 100) {
    query = query.ilike("full_name", `%${search}%`);
  }

  if (level) {
    query = query.eq("level", level);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
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

  const validationError = firstError(
    validateString(full_name, "full_name", { max: 100 }),
    validateString(level, "level", { max: 50 }),
    validatePhone(phone),
    validatePhone(parent_phone),
  );
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      teacher_id: user.id,
      full_name: full_name.trim().slice(0, 100),
      phone: phone?.trim().slice(0, 20) || null,
      parent_phone: parent_phone?.trim().slice(0, 20) || null,
      level: level.trim().slice(0, 50),
      section: section?.trim().slice(0, 50) || null,
      notes: notes?.trim().slice(0, 500) || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
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
