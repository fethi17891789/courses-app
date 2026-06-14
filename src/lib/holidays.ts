// Algerian public holidays, computed automatically for any year.
//
// - Fixed Gregorian dates: exact, forever.
// - Religious (Hijri) dates: computed via the islamic-umalqura calendar (Intl).
//   These can differ by +/-1 day from the official date (set by moon sighting in
//   Algeria), so they are flagged `lunar` and shown as approximate in the UI.

export type Holiday = { key: string; lunar: boolean };

// Fixed Gregorian holidays (month is 1-12).
const FIXED: { month: number; day: number; key: string }[] = [
  { month: 1, day: 1, key: "newYear" },
  { month: 1, day: 12, key: "yennayer" },
  { month: 5, day: 1, key: "labourDay" },
  { month: 7, day: 5, key: "independenceDay" },
  { month: 11, day: 1, key: "revolutionDay" },
];

// Religious holidays by Hijri month/day (islamic-umalqura). The two Aids span 2 days.
const LUNAR: { hMonth: number; hDay: number; key: string }[] = [
  { hMonth: 1, hDay: 1, key: "hijriNewYear" },
  { hMonth: 1, hDay: 10, key: "ashura" },
  { hMonth: 3, hDay: 12, key: "mawlid" },
  { hMonth: 10, hDay: 1, key: "eidFitr" },
  { hMonth: 10, hDay: 2, key: "eidFitr" },
  { hMonth: 12, hDay: 10, key: "eidAdha" },
  { hMonth: 12, hDay: 11, key: "eidAdha" },
];

const cache = new Map<number, Map<string, Holiday>>();

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

let hijriFmt: Intl.DateTimeFormat | null = null;

function getHijriParts(date: Date): { month: number; day: number } {
  if (!hijriFmt) {
    hijriFmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  let month = 0;
  let day = 0;
  for (const p of hijriFmt.formatToParts(date)) {
    if (p.type === "month") month = parseInt(p.value, 10);
    else if (p.type === "day") day = parseInt(p.value, 10);
  }
  return { month, day };
}

export function getHolidaysForYear(year: number): Map<string, Holiday> {
  const cached = cache.get(year);
  if (cached) return cached;

  const map = new Map<string, Holiday>();

  for (const f of FIXED) {
    map.set(dateKey(year, f.month, f.day), { key: f.key, lunar: false });
  }

  // Walk every day of the Gregorian year and read its Hijri date.
  const cursor = new Date(Date.UTC(year, 0, 1));
  while (cursor.getUTCFullYear() === year) {
    const { month: hM, day: hD } = getHijriParts(cursor);
    for (const L of LUNAR) {
      if (L.hMonth === hM && L.hDay === hD) {
        const k = dateKey(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth() + 1,
          cursor.getUTCDate(),
        );
        if (!map.has(k)) map.set(k, { key: L.key, lunar: true });
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  cache.set(year, map);
  return map;
}

// Returns the holiday for a given calendar date, or null.
export function getHoliday(date: Date): Holiday | null {
  const map = getHolidaysForYear(date.getFullYear());
  return (
    map.get(dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate())) ??
    null
  );
}
