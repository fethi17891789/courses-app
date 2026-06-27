import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Do not capture personal data (IP, cookies, request bodies, headers).
  // The app handles student names and phone numbers; only the technical error is sent.
  sendDefaultPii: false,
  // Sample a fraction of requests for performance tracing to stay within the free tier.
  tracesSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
