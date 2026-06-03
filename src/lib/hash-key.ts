import { createHash } from "crypto";

/**
 * Hash an activation key with SHA-256.
 * Deterministic: same input always gives same output,
 * so we can still do database lookups.
 */
export function hashKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex");
}
