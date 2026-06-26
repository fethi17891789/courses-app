"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import dynamic from "next/dynamic";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import type { StudentSubject } from "@/types/subjects";

const PdfViewer = dynamic(
  () => import("@/components/subjects/pdf-viewer").then((m) => m.PdfViewer),
  { ssr: false },
);

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(
    locale === "ar" ? "ar-DZ" : "fr-FR",
    { day: "numeric", month: "short", year: "numeric" },
  );
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export function StudentSubjects() {
  const t = useTranslations("subjects");
  const locale = useLocale();

  const [items, setItems] = useState<StudentSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    fetch("/api/student/subjects")
      .then((r) => r.json())
      .then((data) => setItems(data.subjects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0fdf4]"
    >
      <motion.div variants={fadeUp} className="px-5 pb-1 pt-10">
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">{t("title")}</h1>
        <p className="text-[11px] font-semibold text-[#1e1b4b]/40">
          {t("studentSubtitle")}
        </p>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 scrollbar-hide">
        {loading ? null : items.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center justify-center pt-16 text-center"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                boxShadow: "0 3px 0 #bbf7d0",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
            <p className="mt-4 text-[14px] font-extrabold text-[#1e1b4b]">
              {t("studentEmpty")}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[#1e1b4b]/40">
              {t("studentEmptyDesc")}
            </p>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="flex flex-col gap-3">
            {items.map((s) => (
              <button
                key={s.id}
                onPointerUp={() => setPreview({ id: s.id, title: s.title })}
                className="w-full rounded-xl bg-white p-4 text-left transition-[box-shadow] duration-200"
                style={{
                  boxShadow: "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      boxShadow: "0 2px 0 #b91c1c",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-extrabold text-[#1e1b4b]">
                      {s.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-bold text-[#22c55e]">
                      {s.teacher_name}
                      {s.group_names ? ` · ${s.group_names}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#1e1b4b]/40">
                    PDF · {formatSize(s.file_size)}
                  </span>
                  <span className="text-[10px] font-semibold text-[#1e1b4b]/30">
                    {formatDate(s.created_at, locale)}
                  </span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
        <div className="h-28" />
      </div>

      <AnimatePresence>
        {preview && (
          <PdfViewer
            subjectId={preview.id}
            title={preview.title}
            onClose={() => setPreview(null)}
          />
        )}
      </AnimatePresence>

      <BottomNav active="subjects" role="eleve" />
    </motion.main>
  );
}
