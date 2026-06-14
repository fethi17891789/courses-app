"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import type { StudentAnnouncement } from "@/types/announcements";

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

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function StudentAnnouncements() {
  const t = useTranslations("announcements");
  const locale = useLocale();

  const [items, setItems] = useState<StudentAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [openItem, setOpenItem] = useState<StudentAnnouncement | null>(null);

  useEffect(() => {
    fetch("/api/student/announcements")
      .then((r) => r.json())
      .then((data) => setItems(data.announcements || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((a) =>
        a.id === id && !a.read_at
          ? { ...a, read_at: new Date().toISOString() }
          : a,
      ),
    );
    fetch(`/api/student/announcements/${id}/read`, { method: "POST" }).catch(
      () => {},
    );
  }, []);

  function handleOpen(a: StudentAnnouncement) {
    setOpenItem(a);
    if (!a.read_at) markRead(a.id);
  }

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
                <path d="M3 11l18-5v12L3 14v-3z" />
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
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
            {items.map((a) => {
              const unread = !a.read_at;
              return (
                <button
                  key={a.id}
                  onPointerUp={() => handleOpen(a)}
                  className="w-full rounded-xl bg-white p-4 text-left transition-[box-shadow] duration-200"
                  style={{
                    boxShadow: unread
                      ? "0 3px 0 #bbf7d0, 0 6px 16px -4px rgba(34,197,94,0.18)"
                      : "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white"
                      style={{
                        background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                        boxShadow: "0 2px 0 #5b21b6",
                      }}
                    >
                      {initialsOf(a.teacher_name) || "P"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-[#1e1b4b]">
                          {a.title}
                        </p>
                        {a.pinned && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 17v5" />
                            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                          </svg>
                        )}
                        {unread && (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#22c55e]" />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] font-bold text-[#7c3aed]">
                        {a.teacher_name}
                        {a.group_names ? ` · ${a.group_names}` : ""}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-[12px] font-semibold leading-relaxed text-[#1e1b4b]/60">
                    {a.body}
                  </p>

                  <div className="mt-2">
                    <span className="text-[10px] font-semibold text-[#1e1b4b]/30">
                      {formatDate(a.created_at, locale)}
                    </span>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
        <div className="h-28" />
      </div>

      {/* Full announcement sheet */}
      <AnimatePresence>
        {openItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30"
            onClick={() => setOpenItem(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 scrollbar-hide"
              style={{
                maxHeight: "85dvh",
                boxShadow: "0 -4px 0 #e9e5f5, 0 -16px 48px -12px rgba(30,27,75,0.2)",
              }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e9e5f5]" />

              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[12px] font-black text-white"
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                    boxShadow: "0 2px 0 #5b21b6",
                  }}
                >
                  {initialsOf(openItem.teacher_name) || "P"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-[#7c3aed]">
                    {openItem.teacher_name}
                  </p>
                  <p className="text-[11px] font-semibold text-[#1e1b4b]/40">
                    {formatDate(openItem.created_at, locale)}
                  </p>
                </div>
                {openItem.pinned && (
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "linear-gradient(135deg, #fff7ed, #ffedd5)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 17v5" />
                      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                    </svg>
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-[18px] font-extrabold leading-snug text-[#1e1b4b]">
                {openItem.title}
              </h2>
              {openItem.group_names && (
                <p className="mt-1 text-[12px] font-bold text-[#7c3aed]">
                  {openItem.group_names}
                </p>
              )}

              <p className="mt-3 whitespace-pre-wrap text-[13px] font-semibold leading-relaxed text-[#1e1b4b]/70">
                {openItem.body}
              </p>

              <div className="h-4" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav active="announcements" role="eleve" />
    </motion.main>
  );
}
