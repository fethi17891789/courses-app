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

  if (!group_id || !student_id || typeof amount !== "number" || amount <= 0 || amount > 100_000) {
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

  // Anti-doublon : verifie si un paiement identique existe dans les 60 dernieres secondes
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: duplicate } = await supabase
    .from("payments")
    .select("id")
    .eq("group_id", group_id)
    .eq("student_id", student_id)
    .eq("session_date", today)
    .eq("amount", amount)
    .gte("created_at", oneMinuteAgo)
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json({ error: "duplicate_payment" }, { status: 409 });
  }

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
