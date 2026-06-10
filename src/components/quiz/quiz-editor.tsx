"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { Quiz, QuizQuestion, QuizChoice } from "@/types/quiz";
import { CHOICE_COLORS } from "@/types/quiz";

const ease = [0.23, 1, 0.32, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

const COLORS: Array<QuizChoice["color"]> = ["red", "blue", "yellow", "green"];
const TIME_OPTIONS = [10, 15, 20, 30, 45, 60];

type DraftChoice = { text: string; is_correct: boolean; color: QuizChoice["color"] };
type DraftQuestion = { id?: string; question_text: string; time_limit: number; choices: DraftChoice[] };

function emptyQuestion(): DraftQuestion {
  return {
    question_text: "",
    time_limit: 20,
    choices: COLORS.map((color) => ({ text: "", is_correct: false, color })),
  };
}

function ArrowLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function QuestionCard({
  q,
  index,
  onUpdate,
  onDelete,
  canDelete,
}: {
  q: DraftQuestion;
  index: number;
  onUpdate: (updated: DraftQuestion) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const t = useTranslations("quiz");
  const [expanded, setExpanded] = useState(index === 0);

  function updateChoice(i: number, field: keyof DraftChoice, value: string | boolean) {
    const choices = q.choices.map((c, ci) =>
      ci === i
        ? { ...c, [field]: value }
        : field === "is_correct" && value === true
          ? { ...c, is_correct: false }
          : c
    );
    onUpdate({ ...q, choices });
  }

  const correctIdx = q.choices.findIndex((c) => c.is_correct);

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-[22px] bg-white"
      style={{ boxShadow: "0 4px 0 #ddd6fe, 0 8px 20px -6px rgba(124,58,237,0.1)" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-4 text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl text-[13px] font-extrabold text-white"
            style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}>
            {index + 1}
          </div>
          <div className="text-[14px] font-bold text-[#1e1b4b]">
            {q.question_text || <span className="text-[#1e1b4b]/40">{t("questionLabel", { n: index + 1 })}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {correctIdx >= 0 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: "#22c55e", color: "white" }}>
              <CheckIcon />
            </div>
          )}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e1b4b" strokeWidth="2.4"
            strokeLinecap="round" className="opacity-40"
            style={{ transform: `rotate(${expanded ? 180 : 0}deg)`, transition: "transform 0.2s" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease }}>
            <div className="border-t border-[#f5f3ff] px-4 pb-4 pt-3">
              <textarea
                value={q.question_text}
                onChange={(e) => onUpdate({ ...q, question_text: e.target.value })}
                placeholder={t("questionPlaceholder")}
                rows={2}
                className="w-full resize-none rounded-xl border-2 border-[#ede9fe] bg-[#f5f3ff] px-3 py-2.5 text-[14px] font-medium text-[#1e1b4b] placeholder:text-[#1e1b4b]/30 focus:border-[#a78bfa] focus:outline-none"
              />

              <div className="mt-3 flex items-center gap-2">
                <span className="text-[12px] font-bold text-[#1e1b4b]/50">{t("time")}</span>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                  {TIME_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => onUpdate({ ...q, time_limit: t })}
                      className="shrink-0 rounded-lg px-2.5 py-1 text-[12px] font-bold transition-all"
                      style={{
                        background: q.time_limit === t ? "#7c3aed" : "#ede9fe",
                        color: q.time_limit === t ? "white" : "#7c3aed",
                      }}>
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {q.choices.map((choice, ci) => {
                  const col = CHOICE_COLORS[choice.color];
                  return (
                    <div key={ci} className="relative overflow-hidden rounded-xl p-[2px]"
                      style={{
                        background: choice.is_correct ? col.bg : "transparent",
                        outline: choice.is_correct ? "none" : "2px solid #e5e7eb",
                      }}>
                      <div className="rounded-[10px] bg-white p-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[11px] font-extrabold" style={{ color: choice.color === "yellow" ? "#b45309" : CHOICE_COLORS[choice.color].shadow }}>
                            {col.icon}
                          </span>
                          <button
                            onClick={() => updateChoice(ci, "is_correct", true)}
                            className="ml-auto flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all"
                            style={{
                              borderColor: choice.is_correct ? "#22c55e" : "#e5e7eb",
                              background: choice.is_correct ? "#22c55e" : "transparent",
                              color: choice.is_correct ? "white" : "transparent",
                            }}>
                            <CheckIcon />
                          </button>
                        </div>
                        <input
                          value={choice.text}
                          onChange={(e) => updateChoice(ci, "text", e.target.value)}
                          placeholder={t("answerPlaceholder", { n: ci + 1 })}
                          className="w-full bg-transparent text-[13px] font-medium text-[#1e1b4b] placeholder:text-[#1e1b4b]/30 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {canDelete && (
                <button
                  onClick={onDelete}
                  className="mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold"
                  style={{ background: "#fff1f2", color: "#ef4444" }}>
                  <TrashIcon /> {t("deleteQuestion")}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function draftFromQuiz(quiz: Quiz): { title: string; description: string; questions: DraftQuestion[] } {
  const questions: DraftQuestion[] = (quiz.quiz_questions ?? []).map((q: QuizQuestion) => ({
    id: q.id,
    question_text: q.question_text,
    time_limit: q.time_limit,
    choices: (q.quiz_choices ?? q.choices ?? []).map((c: QuizChoice) => ({
      text: c.text,
      is_correct: c.is_correct,
      color: c.color,
    })),
  }));
  return { title: quiz.title, description: quiz.description ?? "", questions };
}

export function QuizEditor({ initialQuiz }: { initialQuiz?: Quiz }) {
  const t = useTranslations("quiz");
  const locale = useLocale();
  const router = useRouter();
  const isEdit = !!initialQuiz;

  const init = initialQuiz ? draftFromQuiz(initialQuiz) : { title: "", description: "", questions: [emptyQuestion()] };
  const [title, setTitle] = useState(init.title);
  const [description, setDescription] = useState(init.description);
  const [questions, setQuestions] = useState<DraftQuestion[]>(init.questions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pressedBack, setPressedBack] = useState(false);
  const [pressedSave, setPressedSave] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function updateQuestion(i: number, updated: DraftQuestion) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? updated : q)));
  }

  function deleteQuestion(i: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function handleSave() {
    setError("");
    if (!title.trim()) { setError(t("errTitle")); return; }
    if (questions.length === 0) { setError(t("errNoQuestion")); return; }
    for (const [i, q] of questions.entries()) {
      if (!q.question_text.trim()) { setError(t("errEmptyQuestion", { n: i + 1 })); return; }
      if (!q.choices.some((c) => c.is_correct)) { setError(t("errNoCorrect", { n: i + 1 })); return; }
      if (!q.choices.some((c) => c.text.trim())) { setError(t("errNoAnswer", { n: i + 1 })); return; }
    }

    setSaving(true);
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      questions: questions.map((q, qi) => ({
        ...(q.id ? { id: q.id } : {}),
        question_text: q.question_text,
        time_limit: q.time_limit,
        order_index: qi,
        choices: q.choices
          .filter((c) => c.text.trim())
          .map((c, ci) => ({
            text: c.text.trim(),
            is_correct: c.is_correct,
            color: c.color,
            order_index: ci,
          })),
      })),
    };

    const res = await fetch(
      isEdit ? `/api/quiz/${initialQuiz!.id}` : "/api/quiz",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("errSave"));
      setSaving(false);
      return;
    }

    router.push(`/${locale}/quiz`);
    router.refresh();
  }

  return (
    <div className="relative min-h-screen overflow-y-auto scrollbar-hide" style={{ background: "#f0ecff", paddingBottom: 120 }}>
      <div className="mx-auto max-w-md px-4 pt-10">
        <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }}>

          <motion.div variants={fadeUp} className="mb-5 flex items-center gap-3">
            <button
              onPointerDown={() => setPressedBack(true)}
              onPointerUp={() => setPressedBack(false)}
              onPointerLeave={() => setPressedBack(false)}
              onClick={() => router.push(`/${locale}/quiz`)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-[#7c3aed] transition-[transform,box-shadow] duration-[80ms] rtl:rotate-180"
              style={{
                background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                transform: `translateY(${pressedBack ? 2 : 0}px)`,
                boxShadow: pressedBack ? "0 0px 0 #c4b5fd" : "0 2px 0 #c4b5fd",
              }}>
              <ArrowLeft />
            </button>
            <div>
              <div className="text-[22px] font-extrabold text-[#1e1b4b] leading-tight">
                {isEdit ? t("editTitle") : t("newTitle")}
              </div>
              <div className="text-[13px] font-medium text-[#1e1b4b]/50">
                {t("questionsCount", { count: questions.length })}
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="mb-4 overflow-hidden rounded-[22px] bg-white p-4"
            style={{ boxShadow: "0 4px 0 #ddd6fe, 0 8px 20px -6px rgba(124,58,237,0.1)" }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              className="w-full rounded-xl border-2 border-[#ede9fe] bg-[#f5f3ff] px-3 py-2.5 text-[15px] font-bold text-[#1e1b4b] placeholder:text-[#1e1b4b]/30 focus:border-[#a78bfa] focus:outline-none"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descPlaceholder")}
              className="mt-2 w-full rounded-xl border-2 border-[#ede9fe] bg-[#f5f3ff] px-3 py-2.5 text-[13px] font-medium text-[#1e1b4b] placeholder:text-[#1e1b4b]/30 focus:border-[#a78bfa] focus:outline-none"
            />
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-col gap-3">
            {questions.map((q, i) => (
              <QuestionCard
                key={i}
                q={q}
                index={i}
                onUpdate={(updated) => updateQuestion(i, updated)}
                onDelete={() => deleteQuestion(i)}
                canDelete={questions.length > 1}
              />
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="mt-3">
            <button
              onClick={addQuestion}
              className="flex w-full items-center justify-center gap-2 rounded-[22px] py-4 text-[14px] font-bold text-[#7c3aed] transition-colors"
              style={{ background: "rgba(124,58,237,0.06)", border: "2px dashed #c4b5fd" }}>
              <PlusIcon /> {t("addQuestion")}
            </button>
          </motion.div>

          <div ref={bottomRef} />
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-4 rounded-2xl px-4 py-3 text-[13px] font-bold text-[#ef4444]"
              style={{ background: "#fff1f2", border: "2px solid #fca5a5" }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 py-4" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}>
        <div className="mx-auto max-w-md">
          <button
            onPointerDown={() => setPressedSave(true)}
            onPointerUp={() => setPressedSave(false)}
            onPointerLeave={() => setPressedSave(false)}
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center rounded-2xl py-4 text-[15px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms]"
            style={{
              background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
              transform: `translateY(${pressedSave ? 4 : 0}px)`,
              boxShadow: pressedSave
                ? "0 0px 0 #5b21b6"
                : "0 4px 0 #5b21b6, 0 8px 24px -6px rgba(124,58,237,0.5)",
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? t("saving") : isEdit ? t("saveEdit") : t("saveNew")}
          </button>
        </div>
      </div>
    </div>
  );
}
