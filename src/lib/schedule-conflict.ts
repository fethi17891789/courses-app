import type { Schedule } from "@/types/groups";

/**
 * Detect overlapping sessions. Two sessions conflict when they fall on the same
 * day and their time ranges overlap (back-to-back sessions that only touch at a
 * boundary, e.g. 08:00-09:00 and 09:00-10:00, do NOT conflict).
 */

export type GroupSchedules = { name: string; schedules: Schedule[] | null };

function toMinutes(time: unknown): number {
  if (typeof time !== "string") return NaN;
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function overlaps(a: Schedule, b: Schedule): boolean {
  if (a.day !== b.day) return false;
  const aStart = toMinutes(a.start_time);
  const aEnd = toMinutes(a.end_time);
  const bStart = toMinutes(b.start_time);
  const bEnd = toMinutes(b.end_time);
  // NaN (missing times) never overlaps.
  return aStart < bEnd && bStart < aEnd;
}

/** True if two sessions inside the same set overlap. */
export function hasInternalConflict(schedules: Schedule[]): boolean {
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      if (overlaps(schedules[i], schedules[j])) return true;
    }
  }
  return false;
}

/**
 * Returns the name of the first other group whose schedule overlaps with one of
 * the given sessions, or null when there is no cross-group conflict.
 */
export function findCrossGroupConflict(
  schedules: Schedule[],
  otherGroups: GroupSchedules[],
): string | null {
  for (const g of otherGroups) {
    for (const other of g.schedules || []) {
      for (const s of schedules) {
        if (overlaps(s, other)) return g.name;
      }
    }
  }
  return null;
}
