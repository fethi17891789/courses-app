import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/admin-auth";
import { getSchoolScope } from "@/lib/school-scope";
import { NextResponse } from "next/server";
import { computeDebt } from "@/lib/debt";

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

  // Directeur : peut encaisser sur tout groupe de l'ecole. Le paiement reste
  // rattache au prof proprietaire (ownerId). Prof : ses groupes uniquement.
  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const { data: group } = await db
    .from("groups")
    .select("id, price, payment_mode, refund_absences, schedules, teacher_id")
    .eq("id", group_id)
    .in("teacher_id", teacherIds)
    .single();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ownerId = group.teacher_id;

  // A manual payment only makes sense to clear an existing debt. Block it when
  // the student owes nothing for this group.
  const [{ data: att }, { data: pays }] = await Promise.all([
    db
      .from("attendance")
      .select("status, session_date")
      .eq("teacher_id", ownerId)
      .eq("group_id", group_id)
      .eq("student_id", student_id),
    db
      .from("payments")
      .select("session_date")
      .eq("teacher_id", ownerId)
      .eq("group_id", group_id)
      .eq("student_id", student_id),
  ]);

  const debt = computeDebt(group, att || [], pays || []);
  if (debt <= 0) {
    return NextResponse.json({ error: "no_debt" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Anti-doublon : verifie si un paiement identique existe dans les 60 dernieres secondes
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: duplicate } = await db
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

  const { data, error } = await db
    .from("payments")
    .insert({
      group_id,
      student_id,
      teacher_id: ownerId,
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
