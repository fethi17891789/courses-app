"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { CHOICE_COLORS } from "@/types/quiz";
import type { Quiz, QuizQuestion, QuizChoice } from "@/types/quiz";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

export function QuizDetail({ quiz }: { quiz: Quiz }) {
  const t = useTranslations("quiz");
  const locale = useLocale();
  const router = useRouter();

  const questions: QuizQuestion[] = quiz.quiz_questions ?? quiz.questions ?? [];

  const [pressedBack, setPressedBack] = useState(false);
  const [pressedLaunch, setPressedLaunch] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  async function handleLaunch() {
    if (launching) return;
    setLaunching(true);
    setError("");
    try {
      const res = await fetch("/api/quiz/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: quiz.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t("launchError", { status: res.status, message: data.error ?? "?" }));
        setLaunching(false);
        return;
      }
      router.push(`/${locale}/quiz/host/${data.session.id}`);
    } catch {
      setError(t("launchErrorNetwork"));
      setLaunching(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-y-auto bg-[#f0ecff] scrollbar-hide" style={{ paddingBottom: 120 }}>
      <div className="mx-auto max-w-md px-5 pt-10">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp} className="mb-5 flex items-center gap-3">
            <button
              onPointerDown={() => setPressedBack(true)}
              onPointerUp={() => setPressedBack(false)}
              onPointerLeave={() => setPressedBack(false)}
              onClick={() => router.push(`/${locale}/quiz`)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[#7c3aed] transition-[transform,box-shadow] duration-[80ms] rtl:rotate-180"
              style={{
                background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                transform: `translateY(${pressedBack ? 2 : 0}px)`,
                boxShadow: pressedBack ? "0 0px 0 #c4b5fd" : "0 2px 0 #c4b5fd",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="truncate text-[22px] font-extrabold leading-tight text-[#1e1b4b]">
                {quiz.title}
              </div>
              <div className="text-[13px] font-medium text-[#1e1b4b]/50">
                {t("questionsCount", { count: questions.length })}
              </div>
            </div>
          </motion.div>

          {quiz.description ? (
            <motion.div
              variants={fadeUp}
              className="mb-4 rounded-xl bg-white p-4 text-[13px] font-semibold text-[#1e1b4b]/60"
              style={{ boxShadow: "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)" }}
            >
              {quiz.description}
            </motion.div>
          ) : null}

          <motion.div variants={fadeUp} className="flex flex-col gap-3">
            {questions.map((q, i) => {
              const choices: QuizChoice[] = q.quiz_choices ?? q.choices ?? [];
              return (
                <div
                  key={q.id ?? i}
                  className="rounded-xl bg-white p-4"
                  style={{ boxShadow: "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[13px] font-extrabold text-white"
                      style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1 text-[14px] font-extrabold text-[#1e1b4b]">
                      {q.question_text || t("questionLabel", { n: i + 1 })}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {choices.map((c, ci) => {
                      const col = CHOICE_COLORS[c.color];
                      return (
                        <div
                          key={c.id ?? ci}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-bold text-[#1e1b4b]"
                          style={{
                            background: c.is_correct ? "#f0fdf4" : "#f9f7ff",
                            border: c.is_correct ? "2px solid #22c55e" : "2px solid transparent",
                          }}
                        >
                          <span className="text-[11px]" style={{ color: col.shadow }}>{col.icon}</span>
                          <span className="truncate">{c.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-4 rounded-2xl px-4 py-3 text-[13px] font-bold text-[#ef4444]"
                style={{ background: "#fff1f2", border: "2px solid #fca5a5" }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Launch button (fixed bottom) */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-5 py-4" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))" }}>
        <div className="mx-auto max-w-md">
          <button
            onPointerDown={() => setPressedLaunch(true)}
            onPointerUp={() => setPressedLaunch(false)}
            onPointerLeave={() => setPressedLaunch(false)}
            onClick={handleLaunch}
            disabled={launching}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms] disabled:opacity-70"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              transform: `translateY(${pressedLaunch ? 4 : 0}px)`,
              boxShadow: pressedLaunch
                ? "0 0px 0 #5b21b6"
                : "0 4px 0 #5b21b6, 0 8px 24px -6px rgba(124,58,237,0.5)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {t("launch")}
          </button>
        </div>
      </div>

      {/* Launching overlay */}
      <AnimatePresence>
        {launching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(30,27,75,0.5)" }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl bg-white px-10 py-8 text-center"
              style={{ boxShadow: "0 4px 0 #5b21b6, 0 20px 60px rgba(124,58,237,0.3)" }}
            >
              <div className="text-[26px] font-extrabold text-[#7c3aed]">{t("launching")}</div>
              <div className="mt-2 text-[13px] font-medium text-[#1e1b4b]/60">{t("launchingDesc")}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
