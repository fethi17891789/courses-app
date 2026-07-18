"use client";

import { useState, useEffect } from "react";
import { getCache, setCache } from "@/lib/page-cache";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { SwipeCard } from "@/components/attendance/swipe-card";
import { useSchoolTeachers, TeacherBadge } from "@/components/dashboard/teacher-scope";
import { ListSkeleton } from "@/components/ui/skeleton";
import type { TodaySession } from "@/types/attendance";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

type StudentCard = {
  id: string;
  full_name: string;
  phone: string | null;
  level: string;
  payment_due: boolean;
  payment_amount: number;
};

type SwipeResult = {
  student_id: string;
  status: "present" | "absent";
  paid: boolean;
};

export function AttendanceScreen() {
  const t = useTranslations("attendance");
  const tGroups = useTranslations("groups");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [sessions, setSessions] = useState<TodaySession[]>(() => getCache<TodaySession[]>("attendance:today") ?? []);
  const [loading, setLoading] = useState(() => getCache<TodaySession[]>("attendance:today") === null);

  // Vue directeur : badge du prof qui enseigne chaque seance.
  const teachers = useSchoolTeachers();
  const isDirector = teachers.length > 1;
  const teacherMap = new Map(teachers.map((tc) => [tc.id, tc]));
  const [activeSession, setActiveSession] = useState<TodaySession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<SwipeResult[]>([]);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/attendance/today")
      .then((res) => res.json())
      .then((data) => {
        setCache("attendance:today", data);
        setSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const [remainingStudents, setRemainingStudents] = useState<StudentCard[]>([]);

  function handleSelectSession(session: TodaySession) {
    const calledSet = new Set(session.called_student_ids || []);
    const remaining = session.students.filter((s) => !calledSet.has(s.id));
    setActiveSession(session);
    setRemainingStudents(remaining);
    setCurrentIndex(0);
    setResults([]);
    setDone(remaining.length === 0);
  }

  async function handleSwipe(direction: "left" | "right" | "up") {
    if (!activeSession) return;
    const student = remainingStudents[currentIndex];
    if (!student) return;

    const status = direction === "left" ? "absent" : "present";
    const paid = direction === "right" && student.payment_due;

    const result: SwipeResult = { student_id: student.id, status, paid };
    const newResults = [...results, result];
    setResults(newResults);

    // Save to backend
    fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group_id: activeSession.group_id,
        student_id: student.id,
        session_day: activeSession.day,
        session_time: activeSession.start_time,
        status,
        paid,
        amount: paid ? (student.payment_amount || activeSession.price) : 0,
      }),
    }).catch(() => {});

    if (currentIndex + 1 >= remainingStudents.length) {
      setSaving(true);
      await new Promise((r) => setTimeout(r, 300));
      setSaving(false);
      setDone(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function handleUndo() {
    if (currentIndex <= 0 || results.length === 0) return;
    setResults(results.slice(0, -1));
    setCurrentIndex(currentIndex - 1);
  }

  function handleBackToSessions() {
    setActiveSession(null);
    setDone(false);
    setResults([]);
    setCurrentIndex(0);
  }

  const presentCount = results.filter((r) => r.status === "present").length;
  const absentCount = results.filter((r) => r.status === "absent").length;

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff]"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 px-5 pb-1 pt-10">
        <button
          onClick={() => {
            if (activeSession && !done) {
              handleBackToSessions();
            } else {
              router.push(`/${locale}/dashboard`);
            }
          }}
          className="btn-push flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
            "--push-shadow": "#e9e5f5",
            "--push-glow": "rgba(124,58,237,0.1)",
          } as React.CSSProperties}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">
          {t("title")}
        </h1>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 scrollbar-hide">
        {/* Loading */}
        {loading && (
          <motion.div variants={fadeUp}>
            <ListSkeleton count={3} />
          </motion.div>
        )}

        {/* No sessions */}
        {!loading && sessions.length === 0 && (
          <motion.div variants={fadeUp} className="py-16 text-center">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg, #f5f3ff, #ede9fe)", boxShadow: "0 3px 0 #e9e5f5" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <p className="text-[15px] font-extrabold text-[#1e1b4b]">{t("noSessions")}</p>
            <p className="mt-1 text-[12px] font-semibold text-[#1e1b4b]/40">{t("noSessionsDesc")}</p>
          </motion.div>
        )}

        {/* Session list */}
        {!loading && !activeSession && sessions.length > 0 && (
          <motion.div variants={fadeUp}>
            <p className="mb-3 text-[12px] font-bold uppercase text-[#1e1b4b]/30">
              {t("selectSession")}
            </p>
            <div className="flex flex-col gap-3">
              {sessions.map((session, i) => {
                const empty = session.students.length === 0;
                const disabled = empty || session.completed;
                const owner = isDirector ? teacherMap.get(session.teacher_id) : null;
                return (
                <button
                  key={`${session.group_id}-${session.day}-${i}`}
                  onClick={() => !disabled && handleSelectSession(session)}
                  disabled={disabled}
                  className={`btn-push w-full rounded-2xl p-4 text-left ${disabled ? "opacity-40" : ""}`}
                  style={{
                    background: disabled ? "#e9e5f5" : "white",
                    "--push-shadow": "#e9e5f5",
                    "--push-glow": "rgba(30,27,75,0.08)",
                  } as React.CSSProperties}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[12px] font-black text-white"
                      style={{
                        background: disabled
                          ? "linear-gradient(135deg, #a1a1aa, #71717a)"
                          : "linear-gradient(135deg, #22c55e, #16a34a)",
                        boxShadow: disabled ? "0 2px 0 #52525b" : "0 2px 0 #15803d",
                      }}
                    >
                      {session.start_time.slice(0, 5)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-extrabold text-[#1e1b4b]">
                        {session.group_name}
                      </p>
                      <p className="text-[11px] font-semibold text-[#1e1b4b]/40">
                        {tGroups(`day${session.day}`)} {session.start_time} - {session.end_time}
                      </p>
                      {owner && (
                        <div className="mt-1.5">
                          <TeacherBadge name={owner.name} self={owner.is_self} />
                        </div>
                      )}
                    </div>
                    <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${disabled ? "bg-zinc-100 text-zinc-400" : "bg-[#f0ecff] text-[#7c3aed]"}`}>
                      {session.completed ? t("done") : t("students", { count: session.students.length })}
                    </span>
                  </div>
                </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Swipe view */}
        {activeSession && !done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease }}
          >
            {/* Session info */}
            <div className="mb-4 text-center">
              <p className="text-[14px] font-extrabold text-[#1e1b4b]">
                {activeSession.group_name}
              </p>
              <p className="text-[11px] font-semibold text-[#1e1b4b]/40">
                {currentIndex + 1} / {remainingStudents.length}
              </p>
            </div>

            {/* Swipe hints */}
            {(() => {
              const currentStudent = remainingStudents[currentIndex];
              const hasPay = currentStudent?.payment_due;
              return (
                <div className={`mb-4 flex px-2 ${hasPay ? "justify-between" : "justify-between"}`}>
                  <span className="rounded-lg bg-red-50 px-2 py-1 text-[9px] font-bold text-red-500">
                    {t("swipeLeft")}
                  </span>
                  {hasPay && (
                    <span className="rounded-lg bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-600">
                      {t("swipeUp")}
                    </span>
                  )}
                  <span className="rounded-lg bg-green-50 px-2 py-1 text-[9px] font-bold text-green-600">
                    {hasPay ? t("swipeRight") : t("present")}
                  </span>
                </div>
              );
            })()}

            {/* Card stack */}
            <div className="relative mx-auto h-[340px] w-full max-w-[300px]">
              {remainingStudents
                .slice(currentIndex, currentIndex + 3)
                .reverse()
                .map((student, stackIndex, arr) => {
                  const isTop = stackIndex === arr.length - 1;
                  const depth = arr.length - 1 - stackIndex;
                  return (
                    <SwipeCard
                      key={student.id}
                      student={student}
                      isTop={isTop}
                      depth={depth}
                      onSwipe={handleSwipe}
                      price={activeSession.price}
                    />
                  );
                })}
            </div>

            {/* Undo button */}
            {currentIndex > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex justify-center"
              >
                <button
                  onClick={handleUndo}
                  className="btn-push flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-extrabold text-[#7c3aed]"
                  style={{
                    background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                    "--push-shadow": "#e9e5f5",
                    "--push-glow": "rgba(124,58,237,0.1)",
                  } as React.CSSProperties}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10h13a4 4 0 0 1 0 8H7" />
                    <path d="M3 10l4-4M3 10l4 4" />
                  </svg>
                  {t("undo")}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Done screen */}
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease }}
            className="py-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 4px 0 #15803d, 0 8px 20px -6px rgba(34,197,94,0.4)" }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </motion.div>
            <p className="text-[18px] font-extrabold text-[#1e1b4b]">{t("done")}</p>
            <p className="mt-1 text-[13px] font-semibold text-[#1e1b4b]/50">
              {t("doneDesc", { present: presentCount, absent: absentCount })}
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleBackToSessions}
                className="btn-push w-full rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed]"
                style={{ "--push-shadow": "#ddd6fe", "--push-glow": "rgba(124,58,237,0.1)" } as React.CSSProperties}
              >
                {t("backToSessions")}
              </button>
              <button
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="btn-push w-full rounded-xl py-3 text-[13px] font-extrabold text-white"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                  "--push-shadow": "#5b21b6",
                  "--push-glow": "rgba(124,58,237,0.4)",
                } as React.CSSProperties}
              >
                {t("backToDashboard")}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="h-24 shrink-0" />
    </motion.main>
  );
}
