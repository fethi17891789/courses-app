/**
 * Simple input validation helpers.
 * Returns an error string if invalid, or null if valid.
 */

export function validateString(
  value: unknown,
  label: string,
  { min = 1, max = 255 }: { min?: number; max?: number } = {},
): string | null {
  if (typeof value !== "string" || value.trim().length < min) {
    return `${label}: minimum ${min} caractere(s)`;
  }
  if (value.trim().length > max) {
    return `${label}: maximum ${max} caracteres`;
  }
  return null;
}

export function validatePhone(value: unknown): string | null {
  if (!value) return null; // phone is optional
  if (typeof value !== "string") return "phone: format invalide";
  const cleaned = value.replace(/[\s\-().+]/g, "");
  if (cleaned.length < 8 || cleaned.length > 15 || !/^\d+$/.test(cleaned)) {
    return "phone: format invalide";
  }
  return null;
}

export function validateNumber(
  value: unknown,
  label: string,
  { min = 0, max = 1_000_000 }: { min?: number; max?: number } = {},
): string | null {
  if (typeof value !== "number" || isNaN(value)) {
    return `${label}: doit etre un nombre`;
  }
  if (value < min || value > max) {
    return `${label}: doit etre entre ${min} et ${max}`;
  }
  return null;
}

export function validateSchedules(value: unknown): string | null {
  if (!Array.isArray(value)) return null; // optional
  for (const s of value) {
    if (typeof s !== "object" || s === null) return "schedules: format invalide";
    if (typeof s.day !== "number" || s.day < 0 || s.day > 6) {
      return "schedules: jour invalide (0-6)";
    }
  }
  return null;
}

export function validateEnrolledSessions(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const s of value) {
    if (typeof s !== "number" || s < 0 || s > 6) {
      return "enrolled_sessions: jour invalide (0-6)";
    }
  }
  return null;
}

/** Run all validators, return first error or null */
export function firstError(...errors: (string | null)[]): string | null {
  return errors.find((e) => e !== null) ?? null;
}
