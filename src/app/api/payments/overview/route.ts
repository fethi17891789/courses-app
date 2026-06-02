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
    .select("id, name, price, payment_mode, refund_absences, schedules")
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
    if (sessionsCalled === 0) continue;

    const totalPaid = paidMap.get(key) || 0;

    // Get this student's attendance records for this group
    const studentAttendance = (attendance || []).filter(
      (a: any) => a.student_id === student.id && a.group_id === m.group_id
    );

    // Get this student's payment dates for this group
    const studentPayments = (payments || []).filter(
      (p: any) => p.student_id === student.id && p.group_id === m.group_id
    );
    const paidDates = new Set(studentPayments.map((p: any) => p.session_date));

    // Build unpaid sessions list
    const unpaidSessions: { date: string; day: number; amount: number }[] = [];

    if (group.payment_mode === "per_session") {
      // Each present session without a matching payment date
      for (const a of studentAttendance) {
        if (a.status === "present" && !paidDates.has(a.session_date)) {
          unpaidSessions.push({ date: a.session_date, day: a.session_day, amount: group.price });
        }
      }
    } else {
      // Monthly/weekly: group by period
      const periods = new Map<string, { present: number; total: number; dates: string[] }>();

      for (const a of studentAttendance) {
        let periodKey: string;
        if (group.payment_mode === "monthly") {
          periodKey = a.session_date.slice(0, 7); // "YYYY-MM"
        } else {
          // Weekly: get week start (Sunday)
          const d = new Date(a.session_date);
          d.setDate(d.getDate() - d.getDay());
          periodKey = d.toISOString().split("T")[0];
        }
        if (!periods.has(periodKey)) periods.set(periodKey, { present: 0, total: 0, dates: [] });
        const p = periods.get(periodKey)!;
        p.total++;
        if (a.status === "present") p.present++;
        p.dates.push(a.session_date);
      }

      for (const [periodKey, info] of periods) {
        // Check if already paid for this period
        const hasPaid = info.dates.some((d) => paidDates.has(d)) ||
          studentPayments.some((p: any) => {
            if (group.payment_mode === "monthly") return p.session_date.startsWith(periodKey);
            return p.session_date >= periodKey;
          });
        if (hasPaid) continue;

        let amount = group.price;
        if (group.refund_absences) {
          const scheduleDays = (group.schedules || []).length;
          const totalInPeriod = group.payment_mode === "monthly"
            ? (() => {
                const [y, mo] = periodKey.split("-").map(Number);
                const lastDay = new Date(y, mo, 0).getDate();
                let count = 0;
                for (let d = 1; d <= lastDay; d++) {
                  const date = new Date(y, mo - 1, d);
                  if ((group.schedules || []).some((s: any) => s.day === date.getDay())) count++;
                }
                return count;
              })()
            : scheduleDays;
          if (totalInPeriod > 0) {
            amount = Math.round((group.price / totalInPeriod) * info.present);
          }
        }

        if (amount > 0) {
          const label = group.payment_mode === "monthly" ? periodKey : periodKey;
          unpaidSessions.push({ date: label, day: -1, amount });
        }
      }
    }

    const debt = unpaidSessions.reduce((sum, s) => sum + s.amount, 0);
    if (debt > 0) {
      studentDebts.push({
        student_id: student.id,
        student_name: student.full_name,
        student_level: student.level,
        group_id: m.group_id,
        group_name: group.name,
        total_due: totalPaid + debt,
        total_paid: totalPaid,
        debt,
        unpaid_sessions: unpaidSessions,
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
