import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Find student records linked to this auth user
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, teacher_id, group_members(group_id, enrolled_sessions, groups:groups(id, name, level, section, schedules, price, payment_mode, teacher_id))")
    .eq("auth_user_id", user.id);

  if (!students || students.length === 0) {
    return NextResponse.json({ groups: [], schedule: {}, absences: [], payments: [] });
  }

  const studentIds = students.map((s) => s.id);

  // Get all groups the student is in
  const groups: any[] = [];
  for (const student of students) {
    for (const gm of student.group_members || []) {
      const g = gm.groups as any;
      if (!g) continue;
      groups.push({
        group_id: g.id,
        group_name: g.name,
        level: g.level,
        section: g.section,
        schedules: g.schedules || [],
        price: g.price,
        payment_mode: g.payment_mode,
        enrolled_sessions: gm.enrolled_sessions,
      });
    }
  }

  // Get absences
  const { data: absences } = await supabase
    .from("attendance")
    .select("id, group_id, session_day, session_date, status, groups:group_id(name)")
    .in("student_id", studentIds)
    .eq("status", "absent")
    .order("session_date", { ascending: false })
    .limit(50);

  // Get payments
  const { data: payments } = await supabase
    .from("payments")
    .select("id, group_id, amount, session_date, groups:group_id(name)")
    .in("student_id", studentIds)
    .order("session_date", { ascending: false })
    .limit(50);

  // Build schedule: day -> sessions with payment info
  const now = new Date();
  const algeriaTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Algiers" }));
  const currentYear = algeriaTime.getFullYear();
  const currentMonth = algeriaTime.getMonth();
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const schedule: Record<number, any[]> = {};
  for (let d = 0; d < 7; d++) schedule[d] = [];

  for (const g of groups) {
    const enrolled = g.enrolled_sessions || [];
    const scheduleDays = g.schedules.map((s: any) => s.day);
    const refund = g.refund_absences || false;

    for (const s of g.schedules) {
      if (enrolled.length > 0 && !enrolled.includes(s.day)) continue;

      let isPaymentSession = false;
      if (g.payment_mode === "per_session") {
        isPaymentSession = true;
      } else if (g.payment_mode === "weekly") {
        const sorted = [...scheduleDays].sort((a: number, b: number) => a - b);
        isPaymentSession = refund ? sorted[sorted.length - 1] === s.day : sorted[0] === s.day;
      } else if (g.payment_mode === "monthly") {
        if (refund) {
          let lastScheduleDate = 0;
          for (let d = 1; d <= lastDayOfMonth; d++) {
            const date = new Date(currentYear, currentMonth, d);
            if (scheduleDays.includes(date.getDay())) lastScheduleDate = d;
          }
          let lastThisDay = 0;
          for (let d = 1; d <= lastDayOfMonth; d++) {
            const date = new Date(currentYear, currentMonth, d);
            if (date.getDay() === s.day) lastThisDay = d;
          }
          isPaymentSession = lastThisDay === lastScheduleDate;
        } else {
          let firstScheduleDate = lastDayOfMonth + 1;
          for (let d = 1; d <= lastDayOfMonth; d++) {
            const date = new Date(currentYear, currentMonth, d);
            if (scheduleDays.includes(date.getDay())) { firstScheduleDate = d; break; }
          }
          let firstThisDay = lastDayOfMonth + 1;
          for (let d = 1; d <= lastDayOfMonth; d++) {
            const date = new Date(currentYear, currentMonth, d);
            if (date.getDay() === s.day) { firstThisDay = d; break; }
          }
          isPaymentSession = firstThisDay === firstScheduleDate;
        }
      }

      schedule[s.day].push({
        group_name: g.group_name,
        level: g.level,
        start_time: s.start_time,
        end_time: s.end_time,
        price: g.price,
        payment_mode: g.payment_mode,
        is_payment_session: isPaymentSession,
      });
    }
  }

  for (let d = 0; d < 7; d++) {
    schedule[d].sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
  }

  return NextResponse.json({
    groups,
    schedule,
    absences: absences || [],
    payments: payments || [],
  });
}
