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
  const groupFilter = searchParams.get("group") || null;

  // Get all groups for filter dropdown
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, price, payment_mode, schedules")
    .eq("teacher_id", user.id);

  // Get all attendance records (to know which sessions have been called)
  let attendanceQuery = supabase
    .from("attendance")
    .select("id, group_id, student_id, session_day, session_date, status")
    .eq("teacher_id", user.id);

  if (groupFilter) {
    attendanceQuery = attendanceQuery.eq("group_id", groupFilter);
  }

  const { data: attendance } = await attendanceQuery;

  // Get all payments
  let paymentsQuery = supabase
    .from("payments")
    .select("id, group_id, student_id, amount, session_date")
    .eq("teacher_id", user.id);

  if (groupFilter) {
    paymentsQuery = paymentsQuery.eq("group_id", groupFilter);
  }

  const { data: payments } = await paymentsQuery;

  // Get all members with student info
  let membersQuery = supabase
    .from("group_members")
    .select("group_id, student_id, student:students(id, full_name, phone, level)");

  if (groupFilter) {
    membersQuery = membersQuery.eq("group_id", groupFilter);
  }

  const { data: members } = await membersQuery;

  // Filter members to only include groups owned by this teacher
  const teacherGroupIds = new Set((groups || []).map((g: any) => g.id));
  const validMembers = (members || []).filter((m: any) => teacherGroupIds.has(m.group_id));

  // Build payment map: "studentId-groupId" -> total paid
  const paidMap = new Map<string, number>();
  for (const p of payments || []) {
    const key = `${p.student_id}-${p.group_id}`;
    paidMap.set(key, (paidMap.get(key) || 0) + Number(p.amount));
  }

  // Build attendance map: "studentId-groupId" -> number of sessions attended (present)
  const attendedMap = new Map<string, number>();
  const calledMap = new Map<string, number>();
  for (const a of attendance || []) {
    const key = `${a.student_id}-${a.group_id}`;
    calledMap.set(key, (calledMap.get(key) || 0) + 1);
    if (a.status === "present") {
      attendedMap.set(key, (attendedMap.get(key) || 0) + 1);
    }
  }

  // Calculate debts per student
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studentDebts: any[] = [];
  const seen = new Set<string>();

  for (const m of validMembers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student = m.student as any;
    if (!student) continue;

    const key = `${student.id}-${m.group_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const group = (groups || []).find((g: any) => g.id === m.group_id);
    if (!group) continue;

    const sessionsCalled = calledMap.get(key) || 0;
    if (sessionsCalled === 0) continue; // No attendance taken yet, skip

    const sessionsAttended = attendedMap.get(key) || 0;
    const totalPaid = paidMap.get(key) || 0;

    // Amount owed depends on payment mode
    let totalDue = 0;
    if (group.payment_mode === "per_session") {
      totalDue = sessionsAttended * group.price;
    } else {
      // For monthly/weekly, due = sessions_called * price_per_session is not right
      // For monthly, we count number of distinct months with attendance
      const months = new Set<string>();
      for (const a of attendance || []) {
        if (a.student_id === student.id && a.group_id === m.group_id) {
          months.add(a.session_date.slice(0, 7));
        }
      }
      totalDue = months.size * group.price;
    }

    const debt = totalDue - totalPaid;
    if (debt > 0) {
      studentDebts.push({
        student_id: student.id,
        student_name: student.full_name,
        student_level: student.level,
        group_id: m.group_id,
        group_name: group.name,
        total_due: totalDue,
        total_paid: totalPaid,
        debt,
      });
    }
  }

  studentDebts.sort((a, b) => b.debt - a.debt);

  return NextResponse.json({
    groups: (groups || []).map((g: any) => ({ id: g.id, name: g.name })),
    unpaid_count: studentDebts.length,
    debts: studentDebts,
  });
}
