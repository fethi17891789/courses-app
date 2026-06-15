import { createClient } from "@/lib/supabase-server";
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

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("group_id", group_id)
    .eq("student_id", student_id)
    .eq("session_date", today)
    .eq("session_day", session_day)
    .eq("session_time", session_time)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("attendance")
      .update({ status })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("attendance")
      .insert({
        group_id,
        student_id,
        teacher_id: user.id,
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
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("group_id", group_id)
      .eq("student_id", student_id)
      .eq("session_date", today)
      .eq("session_day", session_day)
      .eq("session_time", session_time)
      .maybeSingle();

    if (!existingPayment) {
      await supabase.from("payments").insert({
        group_id,
        student_id,
        teacher_id: user.id,
        amount,
        session_date: today,
        session_day,
        session_time,
      });
    }
  }

  return NextResponse.json({ success: true });
}
