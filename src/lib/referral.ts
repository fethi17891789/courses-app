import { randomBytes } from "crypto";

/** Both the referrer and the referred prof get this many free days. */
export const REFERRAL_BONUS_DAYS = 14;

/** A referrer can only sponsor one new prof per this many days. */
export const REFERRAL_COOLDOWN_DAYS = 14;

// No confusable chars (0/O, 1/I/L) so the code is easy to type and dictate
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateReferralCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export function normalizeReferralCode(value: string): string {
  return value.trim().toUpperCase();
}
