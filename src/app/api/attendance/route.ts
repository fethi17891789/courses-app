import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/admin-auth";
import { getSchoolScope } from "@/lib/school-scope";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { group_id, student_id, session_day, status, paid, amount } = body;
  const session_time = typeof body.session_time === "string" ? body.session_time : "";

  if (!group_id || !student_id || session_day === undefined || !status) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Directeur : peut faire l'appel sur tout groupe de l'ecole. L'enregistrement
  // reste rattache au prof proprietaire du groupe (ownerId) pour qu'il le voie.
  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  let ownerId = user.id;
  if (scope.isDirector) {
    const { data: g } = await db
      .from("groups")
      .select("teacher_id")
      .eq("id", group_id)
      .in("teacher_id", scope.teacherIds)
      .single();
    if (!g) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    ownerId = g.teacher_id;
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await db
    .from("attendance")
    .select("id")
    .eq("group_id", group_id)
    .eq("student_id", student_id)
    .eq("session_date", today)
    .eq("session_day", session_day)
    .eq("session_time", session_time)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from("attendance")
      .update({ status })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  } else {
    const { error } = await db
      .from("attendance")
      .insert({
        group_id,
        student_id,
        teacher_id: ownerId,
        session_day,
        session_time,
        session_date: today,
        status,
      });

    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  if (paid && amount > 0) {
    const { data: existingPayment } = await db
      .from("payments")
      .select("id")
      .eq("group_id", group_id)
      .eq("student_id", student_id)
      .eq("session_date", today)
      .eq("session_day", session_day)
      .eq("session_time", session_time)
      .maybeSingle();

    if (!existingPayment) {
      await db.from("payments").insert({
        group_id,
        student_id,
        teacher_id: ownerId,
        amount,
        session_date: today,
        session_day,
        session_time,
      });
    }
  }

  return NextResponse.json({ success: true });
}
