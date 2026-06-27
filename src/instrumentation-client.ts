import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // No personal data and no session replay: only technical errors are reported.
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});

// Reports navigation errors between pages (App Router transitions).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
