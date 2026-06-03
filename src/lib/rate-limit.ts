const attempts = new Map<string, { count: number; resetAt: number }>();

if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) {
      if (now > entry.resetAt) attempts.delete(key);
    }
  }, 5 * 60 * 1000).unref?.();
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

export function rateLimitByIp(
  request: Request,
  prefix: string,
  limit = 5,
  windowMs = 15 * 60 * 1000,
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return rateLimit(`${prefix}:${ip}`, limit, windowMs);
}
