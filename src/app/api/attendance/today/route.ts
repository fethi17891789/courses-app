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

  // Use Algeria timezone (UTC+1) to get the correct day
  const now = new Date();
  const algeriaTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Algiers" }));
  const dayOfWeek = algeriaTime.getDay();

  const { data: groups, error } = await supabase
    .from("groups")
    .select("id, name, schedules, price, payment_mode, refund_absences, group_members(id, student_id, enrolled_sessions, student:students(id, full_name, phone, level))")
    .eq("teacher_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const today = algeriaTime.toISOString().split("T")[0];

  const { data: attendanceToday } = await supabase
    .from("attendance")
    .select("group_id, session_day, student_id")
    .eq("teacher_id", user.id)
    .eq("session_date", today);

  // Map: "groupId-day" -> Set of student_ids already called
  const calledMap = new Map<string, Set<string>>();
  for (const a of attendanceToday || []) {
    const key = `${a.group_id}-${a.session_day}`;
    if (!calledMap.has(key)) calledMap.set(key, new Set());
    calledMap.get(key)!.add(a.student_id);
  }

  // Get payments for current month and current week
  const currentMonth = today.slice(0, 7); // "YYYY-MM"
  const weekStart = new Date(algeriaTime);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const { data: recentPayments } = await supabase
    .from("payments")
    .select("group_id, student_id, session_date")
    .eq("teacher_id", user.id)
    .gte("session_date", `${currentMonth}-01`);

  // Map: "groupId-studentId" -> payment dates
  const paymentMap = new Map<string, string[]>();
  for (const p of recentPayments || []) {
    const key = `${p.group_id}-${p.student_id}`;
    if (!paymentMap.has(key)) paymentMap.set(key, []);
    paymentMap.get(key)!.push(p.session_date);
  }

  // Get attendance for current period (month) to count presences for refund calculation
  const { data: periodAttendance } = await supabase
    .from("attendance")
    .select("group_id, student_id, session_day, session_date, status")
    .eq("teacher_id", user.id)
    .gte("session_date", `${currentMonth}-01`);

  // Map: "groupId-studentId" -> { present: number, total: number }
  const presenceMap = new Map<string, { present: number; total: number }>();
  for (const a of periodAttendance || []) {
    const key = `${a.group_id}-${a.student_id}`;
    if (!presenceMap.has(key)) presenceMap.set(key, { present: 0, total: 0 });
    const entry = presenceMap.get(key)!;
    entry.total++;
    if (a.status === "present") entry.present++;
  }

  // Helper: check if today is the last session of the period for a group
  function isLastSessionOfPeriod(groupSchedules: any[], mode: string): boolean {
    if (mode === "per_session") return true; // always charge

    const scheduleDays = groupSchedules.map((s: any) => s.day).sort((a: number, b: number) => a - b);

    if (mode === "weekly") {
      // Last session day of the week (highest day number still to come or today)
      const remaining = scheduleDays.filter((d: number) => d >= dayOfWeek);
      return remaining.length > 0 && remaining[remaining.length - 1] === dayOfWeek;
    }

    if (mode === "monthly") {
      // Check if there are more sessions this month after today
      const todayDate = algeriaTime.getDate();
      const lastDayOfMonth = new Date(algeriaTime.getFullYear(), algeriaTime.getMonth() + 1, 0).getDate();

      for (let d = todayDate + 1; d <= lastDayOfMonth; d++) {
        const futureDate = new Date(algeriaTime.getFullYear(), algeriaTime.getMonth(), d);
        const futureDay = futureDate.getDay();
        if (scheduleDays.includes(futureDay)) return false;
      }
      return true;
    }

    return false;
  }

  // Helper: count total sessions in the current period for a group
  function totalSessionsInPeriod(groupSchedules: any[], mode: string): number {
    const scheduleDays = groupSchedules.map((s: any) => s.day);

    if (mode === "weekly") {
      return scheduleDays.length;
    }

    if (mode === "monthly") {
      let count = 0;
      const year = algeriaTime.getFullYear();
      const month = algeriaTime.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        const date = new Date(year, month, d);
        if (scheduleDays.includes(date.getDay())) count++;
      }
      return count;
    }

    return 1;
  }

  const sessions = [];

  for (const group of groups || []) {
    const schedules = group.schedules || [];
    for (const schedule of schedules) {
      if (schedule.day !== dayOfWeek) continue;

      const isLastSession = isLastSessionOfPeriod(schedules, group.payment_mode);
      const totalSessions = totalSessionsInPeriod(schedules, group.payment_mode);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const students = (group.group_members || [])
        .filter((m: any) => {
          if (!m.enrolled_sessions || m.enrolled_sessions.length === 0) return true;
          return m.enrolled_sessions.includes(schedule.day);
        })
        .map((m: any) => {
          const s = m.student;
          if (!s) return null;
          const payKey = `${group.id}-${s.id}`;
          const payDates = paymentMap.get(payKey) || [];
          const presence = presenceMap.get(payKey) || { present: 0, total: 0 };

          let paymentDue = false;
          let paymentAmount = group.price;

          if (group.payment_mode === "per_session") {
            paymentDue = true;
            paymentAmount = group.price;
          } else if (group.payment_mode === "monthly") {
            const alreadyPaid = payDates.some((d: string) => d.startsWith(currentMonth));
            paymentDue = !alreadyPaid && isLastSession;
            if (paymentDue && group.refund_absences && totalSessions > 0) {
              // +1 to count today's session (assuming present since payment is shown)
              const presentCount = presence.present + 1;
              paymentAmount = Math.round((group.price / totalSessions) * presentCount);
            }
          } else if (group.payment_mode === "weekly") {
            const alreadyPaid = payDates.some((d: string) => d >= weekStartStr);
            paymentDue = !alreadyPaid && isLastSession;
            if (paymentDue && group.refund_absences && totalSessions > 0) {
              const presentCount = presence.present + 1;
              paymentAmount = Math.round((group.price / totalSessions) * presentCount);
            }
          }

          return { ...s, payment_due: paymentDue, payment_amount: paymentAmount };
        })
        .filter(Boolean);

      const sessionKey = `${group.id}-${schedule.day}`;
      const calledIds = calledMap.get(sessionKey) || new Set();
      const completed = students.length > 0 && students.every((s: any) => calledIds.has(s.id));
      const calledStudentIds = Array.from(calledIds);

      sessions.push({
        group_id: group.id,
        group_name: group.name,
        day: schedule.day,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        price: group.price,
        payment_mode: group.payment_mode,
        students,
        completed,
        called_student_ids: calledStudentIds,
      });
    }
  }

  sessions.sort((a, b) => a.start_time.localeCompare(b.start_time));

  return NextResponse.json(sessions);
}
