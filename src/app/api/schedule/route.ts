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
  const dateParam = searchParams.get("date");

  // Target date (the selected day in the agenda)
  const targetDate = dateParam ? new Date(dateParam) : new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Algiers" }));
  const targetDay = targetDate.getDay();
  const targetDateNum = targetDate.getDate();
  const targetMonth = targetDate.getMonth();
  const targetYear = targetDate.getFullYear();
  const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  const { data: groups, error } = await supabase
    .from("groups")
    .select("id, name, level, section, schedules, price, payment_mode, refund_absences, group_members(count)")
    .eq("teacher_id", user.id);

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const sessions: any[] = [];

  for (const group of groups || []) {
    const memberCount = group.group_members?.[0]?.count ?? 0;
    const scheduleDays = (group.schedules || []).map((s: any) => s.day);

    for (const s of group.schedules || []) {
      if (s.day !== targetDay) continue;

      let isPaymentSession = false;

      if (group.payment_mode === "per_session") {
        isPaymentSession = true;
      } else if (group.payment_mode === "weekly") {
        const sorted = [...scheduleDays].sort((a: number, b: number) => a - b);
        if (group.refund_absences) {
          isPaymentSession = sorted[sorted.length - 1] === s.day;
        } else {
          isPaymentSession = sorted[0] === s.day;
        }
      } else if (group.payment_mode === "monthly") {
        if (group.refund_absences) {
          // Last session of the month: check if no more schedule days after targetDateNum
          let hasLater = false;
          for (let d = targetDateNum + 1; d <= lastDayOfMonth; d++) {
            const date = new Date(targetYear, targetMonth, d);
            if (scheduleDays.includes(date.getDay())) { hasLater = true; break; }
          }
          isPaymentSession = !hasLater;
        } else {
          // First session of the month: check if no schedule days before targetDateNum
          let hasEarlier = false;
          for (let d = 1; d < targetDateNum; d++) {
            const date = new Date(targetYear, targetMonth, d);
            if (scheduleDays.includes(date.getDay())) { hasEarlier = true; break; }
          }
          isPaymentSession = !hasEarlier;
        }
      }

      sessions.push({
        group_id: group.id,
        group_name: group.name,
        level: group.level,
        section: group.section,
        start_time: s.start_time,
        end_time: s.end_time,
        price: group.price,
        payment_mode: group.payment_mode,
        member_count: memberCount,
        is_payment_session: isPaymentSession,
      });
    }
  }

  sessions.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

  return NextResponse.json(sessions);
}
