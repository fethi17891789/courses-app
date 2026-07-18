"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import type { Quiz } from "@/types/quiz";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

function QuizCard({
  quiz,
  onTap,
  wiggling,
  onLongPress,
}: {
  quiz: Quiz;
  onTap: () => void;
  wiggling: boolean;
  onLongPress: () => void;
}) {
  const locale = useLocale();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const [pressed, setPressed] = useState(false);

  const questionCount =
    quiz.quiz_questions?.length ?? quiz.questions?.length ?? 0;

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    setPressed(true);
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
      onLongPress();
    }, 500);
  }, [onLongPress]);

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressed(false);
    if (!didLongPress.current && !wiggling) {
      onTap();
    }
  }, [onTap, wiggling]);

  const handlePointerLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressed(false);
  }, []);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClick={(e) => { if (didLongPress.current) { e.stopPropagation(); didLongPress.current = false; } }}
      className="w-full cursor-pointer rounded-xl bg-white p-4 text-left transition-[transform,box-shadow] duration-[80ms] select-none"
      style={{
        transform: `translateY(${pressed ? 3 : 0}px)`,
        boxShadow: wiggling
          ? "0 3px 0 #c4b5fd, 0 6px 16px -4px rgba(124,58,237,0.15)"
          : pressed
            ? "0 0px 0 #e9e5f5, 0 1px 3px -1px rgba(30,27,75,0.08)"
            : "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)",
        animation: wiggling ? "wiggle 0.25s ease-in-out infinite" : "none",
        borderColor: wiggling ? "#c4b5fd" : "transparent",
        borderWidth: "2px",
        borderStyle: "solid",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold text-[#1e1b4b]">
            {quiz.title}
          </p>
          {quiz.description ? (
            <p className="mt-0.5 truncate text-[12px] font-semibold text-[#1e1b4b]/40">
              {quiz.description}
            </p>
          ) : null}
        </div>
        <div
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1"
          style={{ background: "linear-gradient(135deg, #f5f3ff, #ede9fe)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className="text-[12px] font-bold text-[#7c3aed]">
            {questionCount}
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-[#f0ecff] px-2 py-0.5 text-[10px] font-bold text-[#7c3aed]">
          {new Date(quiz.updated_at).toLocaleDateString(locale === "ar" ? "ar-DZ" : "fr-DZ", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}

export function QuizList({ quizzes: initial }: { quizzes: Quiz[] }) {
  const t = useTranslations("quiz");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [quizzes, setQuizzes] = useState(initial);
  const [wiggleId, setWiggleId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addPressed, setAddPressed] = useState(false);
  const [createPressed, setCreatePressed] = useState(false);

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/quiz/${id}`, { method: "DELETE" });
      if (res.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== id));
        setShowDeleteConfirm(null);
        setWiggleId(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff]"
      onClick={() => { if (wiggleId) setWiggleId(null); }}
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between px-5 pb-1 pt-10">
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">
          {t("title")}
        </h1>
        <button
          onPointerDown={() => setAddPressed(true)}
          onPointerUp={() => setAddPressed(false)}
          onPointerLeave={() => setAddPressed(false)}
          onClick={() => router.push(`/${locale}/quiz/create`)}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-[transform,box-shadow] duration-[80ms]"
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
            transform: `translateY(${addPressed ? 3 : 0}px)`,
            boxShadow: addPressed
              ? "0 0px 0 #5b21b6, 0 1px 3px -1px rgba(124,58,237,0.4)"
              : "0 3px 0 #5b21b6, 0 6px 12px -4px rgba(124,58,237,0.4)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 4a1.5 1.5 0 0 1 1.5 1.5v5h5a1.5 1.5 0 0 1 0 3h-5v5a1.5 1.5 0 0 1-3 0v-5h-5a1.5 1.5 0 0 1 0-3h5v-5A1.5 1.5 0 0 1 12 4z"
              fill="white"
            />
          </svg>
        </button>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 scrollbar-hide">
        {quizzes.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center justify-center pt-16"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                boxShadow: "0 3px 0 #e9e5f5",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <p className="mt-4 text-[14px] font-extrabold text-[#1e1b4b]">
              {t("empty")}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[#1e1b4b]/40 text-center">
              {t("emptyDesc")}
            </p>
            <button
              onPointerDown={() => setCreatePressed(true)}
              onPointerUp={() => setCreatePressed(false)}
              onPointerLeave={() => setCreatePressed(false)}
              onClick={() => router.push(`/${locale}/quiz/create`)}
              className="mt-5 rounded-xl px-5 py-3 text-[13px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms]"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                transform: `translateY(${createPressed ? 4 : 0}px)`,
                boxShadow: createPressed
                  ? "0 0px 0 #5b21b6, 0 2px 4px -2px rgba(124,58,237,0.4)"
                  : "0 4px 0 #5b21b6, 0 8px 20px -6px rgba(124,58,237,0.4)",
              }}
            >
              {t("createCta")}
            </button>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="flex flex-col gap-3">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="relative">
                <QuizCard
                  quiz={quiz}
                  onTap={() => router.push(`/${locale}/quiz/${quiz.id}`)}
                  wiggling={wiggleId === quiz.id}
                  onLongPress={() => setWiggleId(quiz.id)}
                />
                <AnimatePresence>
                  {wiggleId === quiz.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute -top-2 right-2 z-10 flex gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWiggleId(null);
                          router.push(`/${locale}/quiz/${quiz.id}/edit`);
                        }}
                        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-extrabold text-white"
                        style={{
                          background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                          boxShadow: "0 2px 0 #5b21b6",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        {t("edit")}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(quiz.id);
                        }}
                        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-extrabold text-white"
                        style={{
                          background: "linear-gradient(135deg, #ef4444, #dc2626)",
                          boxShadow: "0 2px 0 #b91c1c",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        {t("delete")}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}
        <div className="h-28" />
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-5"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.25, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-5"
              style={{ boxShadow: "0 4px 0 #e9e5f5, 0 16px 48px -12px rgba(30,27,75,0.2)" }}
            >
              <p className="text-[14px] font-extrabold text-[#1e1b4b]">
                {t("deleteTitle")}
              </p>
              <p className="mt-2 text-[12px] font-semibold text-[#1e1b4b]/50">
                {t("deleteConfirm")}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="btn-push rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed]"
                  style={{ "--push-shadow": "#ddd6fe", "--push-glow": "rgba(124,58,237,0.1)" } as React.CSSProperties}
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={deleting}
                  className="btn-push rounded-xl py-3 text-[13px] font-extrabold text-white disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    "--push-shadow": "#b91c1c",
                    "--push-glow": "rgba(239,68,68,0.4)",
                  } as React.CSSProperties}
                >
                  {t("confirm")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.main>
  );
}
