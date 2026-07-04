import { randomBytes } from "crypto";

// Alphabet without confusable characters (no O/0, I/1, L, etc.).
const KEY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Generate a plain activation key in the format XXXX-XXXX-XXXX-XXXX. */
export function generateActivationKey(): string {
  const bytes = randomBytes(16);
  let raw = "";
  for (let i = 0; i < 16; i++) raw += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  return raw.match(/.{1,4}/g)!.join("-");
}
