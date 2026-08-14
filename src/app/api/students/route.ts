import { createClient } from "@/lib/supabase-server";
import { fetchStudents, QueryError } from "@/lib/dashboard-queries";
import { getAuthUser } from "@/lib/auth-user";
import { NextResponse } from "next/server";
import { validateString, validatePhone, validateEnrolledSessions, firstError } from "@/lib/validate";



export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const level = searchParams.get("level")?.trim();

  try {
    return NextResponse.json(await fetchStudents(user, search, level));
  } catch (e) {
    if (e instanceof QueryError) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    throw e;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser();

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

  const plan = user.user_metadata?.plan || "starter";
  if (plan === "starter") {
    const { count } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", user.id);

    if ((count ?? 0) >= 45) {
      return NextResponse.json({ error: "student_limit_reached" }, { status: 403 });
    }
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
