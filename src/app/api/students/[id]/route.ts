import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";


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

  const { data, error } = await supabase
    .from("students")
    .select("*, group_members(id, group_id, enrolled_sessions, groups(name, level, schedules, price, payment_mode))")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: absences } = await supabase
    .from("attendance")
    .select("id, group_id, session_day, session_date, status, groups:group_id(name)")
    .eq("student_id", id)
    .eq("status", "absent")
    .order("session_date", { ascending: false })
    .limit(50);

  const { data: payments } = await supabase
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }



  const body = await request.json();
  const { full_name, phone, parent_phone, level, section, notes, status } = body;

  const { data, error } = await supabase
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
    .eq("teacher_id", user.id)
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



  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
