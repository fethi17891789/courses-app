"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { BottomNav } from "@/components/dashboard/bottom-nav";
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

function QuizIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function QuizCard({
  quiz,
  onEdit,
  onLaunch,
  onDelete,
}: {
  quiz: Quiz;
  onEdit: () => void;
  onLaunch: () => void;
  onDelete: () => void;
}) {
  const [pressed, setPressed] = useState<"edit" | "launch" | "delete" | null>(null);

  return (
    <motion.div variants={fadeUp} className="relative overflow-hidden rounded-[22px] bg-white p-4"
      style={{ boxShadow: "0 4px 0 #ddd6fe, 0 8px 24px -6px rgba(124,58,237,0.12)" }}>
      <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: "linear-gradient(135deg, #ede9fe, #ddd6fe)" }}>
        <span style={{ color: "#7c3aed" }}><QuizIcon /></span>
      </div>

      <div className="pr-12">
        <div className="text-[16px] font-extrabold text-[#1e1b4b] leading-tight">{quiz.title}</div>
        {quiz.description && (
          <div className="mt-1 text-[13px] font-medium text-[#1e1b4b]/50 line-clamp-2">{quiz.description}</div>
        )}
        <div className="mt-2 text-[12px] font-bold text-[#7c3aed]/60">
          {new Date(quiz.updated_at).toLocaleDateString("fr-DZ", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onPointerDown={() => setPressed("edit")}
          onPointerUp={() => setPressed(null)}
          onPointerLeave={() => setPressed(null)}
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold transition-[transform,box-shadow] duration-[80ms]"
          style={{
            background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
            color: "#7c3aed",
            transform: `translateY(${pressed === "edit" ? 2 : 0}px)`,
            boxShadow: pressed === "edit" ? "0 0px 0 #c4b5fd" : "0 2px 0 #c4b5fd",
          }}
        >
          <EditIcon /> Modifier
        </button>

        <button
          onPointerDown={() => setPressed("launch")}
          onPointerUp={() => setPressed(null)}
          onPointerLeave={() => setPressed(null)}
          onClick={onLaunch}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold text-white transition-[transform,box-shadow] duration-[80ms]"
          style={{
            background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
            transform: `translateY(${pressed === "launch" ? 2 : 0}px)`,
            boxShadow: pressed === "launch" ? "0 0px 0 #5b21b6" : "0 2px 0 #5b21b6, 0 4px 12px -2px rgba(124,58,237,0.4)",
          }}
        >
          <PlayIcon /> Lancer
        </button>

        <button
          onPointerDown={() => setPressed("delete")}
          onPointerUp={() => setPressed(null)}
          onPointerLeave={() => setPressed(null)}
          onClick={onDelete}
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-[transform,box-shadow] duration-[80ms]"
          style={{
            background: "linear-gradient(135deg, #fff1f2, #ffe4e6)",
            color: "#ef4444",
            transform: `translateY(${pressed === "delete" ? 2 : 0}px)`,
            boxShadow: pressed === "delete" ? "0 0px 0 #fca5a5" : "0 2px 0 #fca5a5",
          }}
        >
          <TrashIcon />
        </button>
      </div>
    </motion.div>
  );
}

export function QuizList({ quizzes: initial }: { quizzes: Quiz[] }) {
  const [quizzes, setQuizzes] = useState(initial);
  const [launching, setLaunching] = useState<string | null>(null);
  const [pressedCreate, setPressedCreate] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();

  async function handleLaunch(quiz: Quiz) {
    if (launching) return;
    setLaunching(quiz.id);
    try {
      const res = await fetch("/api/quiz/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: quiz.id }),
      });
      if (!res.ok) throw new Error();
      const { session } = await res.json();
      router.push(`/${locale}/quiz/host/${session.id}`);
    } catch {
      setLaunching(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce quiz ?")) return;
    const res = await fetch(`/api/quiz/${id}`, { method: "DELETE" });
    if (res.ok) setQuizzes((prev) => prev.filter((q) => q.id !== id));
  }

  const active = pathname?.includes("/quiz") ? "quiz" : "home";

  return (
    <div className="relative min-h-screen overflow-y-auto scrollbar-hide" style={{ background: "#f0ecff", paddingBottom: 100 }}>
      <div className="mx-auto max-w-md px-4 pt-10">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp} className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-[24px] font-extrabold text-[#1e1b4b] leading-tight">Mes Quiz</div>
              <div className="mt-0.5 text-[13px] font-medium text-[#1e1b4b]/50">
                {quizzes.length} quiz{quizzes.length !== 1 ? "" : ""}
              </div>
            </div>
            <button
              onPointerDown={() => setPressedCreate(true)}
              onPointerUp={() => setPressedCreate(false)}
              onPointerLeave={() => setPressedCreate(false)}
              onClick={() => router.push(`/${locale}/quiz/create`)}
              className="flex items-center gap-2 rounded-2xl px-4 py-3 text-[14px] font-bold text-white transition-[transform,box-shadow] duration-[80ms]"
              style={{
                background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                transform: `translateY(${pressedCreate ? 4 : 0}px)`,
                boxShadow: pressedCreate
                  ? "0 0px 0 #5b21b6"
                  : "0 4px 0 #5b21b6, 0 8px 20px -6px rgba(124,58,237,0.5)",
              }}
            >
              <PlusIcon /> Creer
            </button>
          </motion.div>

          {quizzes.length === 0 ? (
            <motion.div variants={fadeUp}
              className="flex flex-col items-center justify-center rounded-[28px] bg-white px-6 py-14 text-center"
              style={{ boxShadow: "0 4px 0 #ddd6fe, 0 8px 24px -6px rgba(124,58,237,0.1)" }}>
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg, #ede9fe, #ddd6fe)" }}>
                <span style={{ color: "#7c3aed", transform: "scale(2.2)", display: "block" }}><QuizIcon /></span>
              </div>
              <div className="text-[17px] font-extrabold text-[#1e1b4b]">Aucun quiz</div>
              <div className="mt-1 text-[13px] font-medium text-[#1e1b4b]/50">Creez votre premier quiz pour engager vos eleves</div>
              <button
                onClick={() => router.push(`/${locale}/quiz/create`)}
                className="mt-6 rounded-2xl px-6 py-3 text-[14px] font-bold text-white"
                style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)", boxShadow: "0 4px 0 #5b21b6" }}>
                Creer un quiz
              </button>
            </motion.div>
          ) : (
            <motion.div variants={stagger} className="flex flex-col gap-3">
              {quizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  onEdit={() => router.push(`/${locale}/quiz/${quiz.id}`)}
                  onLaunch={() => handleLaunch(quiz)}
                  onDelete={() => handleDelete(quiz.id)}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {launching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(30,27,75,0.5)" }}>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-[28px] bg-white px-10 py-8 text-center"
              style={{ boxShadow: "0 8px 0 #5b21b6, 0 20px 60px rgba(124,58,237,0.3)" }}>
              <div className="text-[32px] font-extrabold text-[#7c3aed]">Lancement...</div>
              <div className="mt-2 text-[14px] font-medium text-[#1e1b4b]/60">Preparation de la session</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav active={active} role="prof" />
    </div>
  );
}
