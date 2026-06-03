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
  const { group_id, student_id, amount } = body;

  if (!group_id || !student_id || !amount || amount <= 0) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Verify group belongs to teacher
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", group_id)
    .eq("teacher_id", user.id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("payments")
    .insert({
      group_id,
      student_id,
      teacher_id: user.id,
      amount,
      session_date: today,
      method: "manual",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
