/**
 * Outstanding debt of a single student in a single group.
 *
 * Mirrors the per-(student, group) logic of /api/payments/overview: a debt is
 * only created by sessions that have actually been called (attendance taken) and
 * not yet paid. Used server-side to block manual payments when nothing is owed.
 */

type DebtGroup = {
  price: number;
  payment_mode: string;
  refund_absences?: boolean | null;
  schedules?: { day: number }[] | null;
};

type DebtAttendance = { status: string; session_date: string };
type DebtPayment = { session_date: string };

export function computeDebt(
  group: DebtGroup,
  attendance: DebtAttendance[],
  payments: DebtPayment[],
): number {
  const paidDates = new Set(payments.map((p) => p.session_date));
  let debt = 0;

  if (group.payment_mode === "per_session") {
    for (const a of attendance) {
      if (a.status === "present" && !paidDates.has(a.session_date)) debt += group.price;
    }
    return debt;
  }

  // monthly / weekly: group attendance by period
  const periods = new Map<string, { present: number; dates: string[] }>();
  for (const a of attendance) {
    let key: string;
    if (group.payment_mode === "monthly") {
      key = a.session_date.slice(0, 7); // "YYYY-MM"
    } else {
      const d = new Date(a.session_date);
      d.setDate(d.getDate() - d.getDay()); // week start (Sunday)
      key = d.toISOString().split("T")[0];
    }
    if (!periods.has(key)) periods.set(key, { present: 0, dates: [] });
    const p = periods.get(key)!;
    if (a.status === "present") p.present++;
    p.dates.push(a.session_date);
  }

  for (const [key, info] of periods) {
    const hasPaid =
      info.dates.some((d) => paidDates.has(d)) ||
      payments.some((p) =>
        group.payment_mode === "monthly" ? p.session_date.startsWith(key) : p.session_date >= key,
      );
    if (hasPaid) continue;

    let amount = group.price;
    if (group.refund_absences) {
      const totalInPeriod =
        group.payment_mode === "monthly"
          ? (() => {
              const [y, mo] = key.split("-").map(Number);
              const lastDay = new Date(y, mo, 0).getDate();
              let count = 0;
              for (let d = 1; d <= lastDay; d++) {
                const date = new Date(y, mo - 1, d);
                if ((group.schedules || []).some((s) => s.day === date.getDay())) count++;
              }
              return count;
            })()
          : (group.schedules || []).length;
      if (totalInPeriod > 0) amount = Math.round((group.price / totalInPeriod) * info.present);
    }

    if (amount > 0) debt += amount;
  }

  return debt;
}
