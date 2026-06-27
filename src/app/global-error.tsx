"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          minHeight: "100dvh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          padding: "24px",
          textAlign: "center",
          backgroundColor: "#f0ecff",
          color: "#1e1b4b",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>
          Une erreur est survenue
        </h1>
        <p style={{ fontSize: "15px", maxWidth: "320px", margin: 0, opacity: 0.8 }}>
          Quelque chose s&apos;est mal passe. Reessaie, le probleme a ete signale automatiquement.
        </p>
        <button
          onClick={() => reset()}
          style={{
            backgroundColor: "#7c3aed",
            color: "white",
            border: "none",
            borderRadius: "16px",
            padding: "14px 28px",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Reessayer
        </button>
      </body>
    </html>
  );
}
