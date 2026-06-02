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
    .select("id, name, schedules, price, payment_mode, group_members(id, student_id, enrolled_sessions, student:students(id, full_name, phone, level))")
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

  // Map: "groupId-studentId" -> Set of payment dates
  const paymentMap = new Map<string, string[]>();
  for (const p of recentPayments || []) {
    const key = `${p.group_id}-${p.student_id}`;
    if (!paymentMap.has(key)) paymentMap.set(key, []);
    paymentMap.get(key)!.push(p.session_date);
  }

  const sessions = [];

  for (const group of groups || []) {
    const schedules = group.schedules || [];
    for (const schedule of schedules) {
      if (schedule.day !== dayOfWeek) continue;

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
          const dates = paymentMap.get(payKey) || [];
          let paymentDue = true;

          if (group.payment_mode === "monthly") {
            paymentDue = !dates.some((d: string) => d.startsWith(currentMonth));
          } else if (group.payment_mode === "weekly") {
            paymentDue = !dates.some((d: string) => d >= weekStartStr);
          }
          // per_session: always due

          return { ...s, payment_due: paymentDue };
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
