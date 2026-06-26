"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Document, Page, pdfjs } from "react-pdf";
import { SIGNED_URL_TTL } from "@/lib/subjects";

// Serve the worker from our own origin (copied to /public by the postinstall script)
// so it is same-origin, cached by the service worker, and works offline.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// Reuse a previously minted signed URL so the file's cache key stays stable across
// opens. A rotating token would bust the browser / service-worker cache on every view,
// defeating the whole point. We expire it a day early to stay inside the real TTL.
function cachedUrl(id: string): string | null {
  try {
    const raw = localStorage.getItem(`subj-url-${id}`);
    if (!raw) return null;
    const { url, exp } = JSON.parse(raw);
    if (typeof url === "string" && typeof exp === "number" && exp > Date.now()) {
      return url;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function storeUrl(id: string, url: string) {
  try {
    const exp = Date.now() + (SIGNED_URL_TTL - 86400) * 1000;
    localStorage.setItem(`subj-url-${id}`, JSON.stringify({ url, exp }));
  } catch {
    /* ignore */
  }
}

async function mintUrl(id: string): Promise<string> {
  const res = await fetch(`/api/subjects/${id}/url`);
  if (!res.ok) throw new Error("url");
  const { url } = await res.json();
  storeUrl(id, url);
  return url;
}

const ease = [0.23, 1, 0.32, 1] as const;

export function PdfViewer({
  subjectId,
  title,
  onClose,
}: {
  subjectId: string;
  title: string;
  onClose: () => void;
}) {
  const t = useTranslations("subjects");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<Uint8Array | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState(false);
  const [closePressed, setClosePressed] = useState(false);

  // Measure the available width so pages fit the screen.
  useEffect(() => {
    function measure() {
      const w = containerRef.current?.clientWidth ?? 0;
      setWidth(Math.min(w - 24, 820));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // One full GET (intercepted + cached by the service worker), then render from memory.
  // Reuse a cached signed URL when possible; if it has gone stale (token expired),
  // mint a fresh one once and retry.
  useEffect(() => {
    let cancelled = false;
    setError(false);
    setData(null);
    setNumPages(0);
    (async () => {
      try {
        let url = cachedUrl(subjectId);
        let fileRes = url ? await fetch(url) : null;
        if (!fileRes || !fileRes.ok) {
          url = await mintUrl(subjectId);
          fileRes = await fetch(url);
        }
        if (!fileRes.ok) throw new Error("file");
        const buf = await fileRes.arrayBuffer();
        if (!cancelled) setData(new Uint8Array(buf));
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const fileProp = useMemo(() => (data ? { data } : undefined), [data]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[70] flex flex-col bg-[#1e1b4b]/95 backdrop-blur-sm"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: "max(16px, env(safe-area-inset-top, 16px))" }}
      >
        <button
          onPointerDown={() => setClosePressed(true)}
          onPointerUp={() => setClosePressed(false)}
          onPointerLeave={() => setClosePressed(false)}
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-[transform,box-shadow] duration-[80ms]"
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
            transform: `translateY(${closePressed ? 3 : 0}px)`,
            boxShadow: closePressed
              ? "0 0px 0 #5b21b6"
              : "0 3px 0 #5b21b6, 0 6px 12px -4px rgba(124,58,237,0.5)",
          }}
          aria-label={t("close")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-white">
          {title}
        </p>
      </div>

      {/* Pages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-3 pb-10 scrollbar-hide"
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <p className="text-[14px] font-extrabold text-white">{t("viewerError")}</p>
            <p className="mt-1 text-[12px] font-semibold text-white/50">
              {t("viewerErrorDesc")}
            </p>
          </div>
        ) : !fileProp ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
              className="h-8 w-8 rounded-full border-[3px] border-white/20 border-t-white"
            />
            <p className="mt-3 text-[12px] font-semibold text-white/50">
              {t("viewerLoading")}
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 pt-1">
            <Document
              file={fileProp}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={() => setError(true)}
              loading={null}
              error={null}
            >
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={i}
                  className="mb-3 overflow-hidden rounded-xl bg-white"
                  style={{ boxShadow: "0 8px 24px -8px rgba(0,0,0,0.5)" }}
                >
                  <Page
                    pageNumber={i + 1}
                    width={width || undefined}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={null}
                  />
                </div>
              ))}
            </Document>
          </div>
        )}
      </div>
    </motion.div>
  );
}
