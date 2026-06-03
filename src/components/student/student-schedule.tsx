"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { getLevelDef } from "@/lib/levels";
import { BottomNav } from "@/components/dashboard/bottom-nav";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

type SessionEntry = {
  group_name: string;
  level: string;
  start_time: string;
  end_time: string;
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysOfWeek(baseDate: Date) {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay());
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ date: d, day: d.getDay() });
  }
  return days;
}

export function StudentScheduleScreen() {
  const t = useTranslations("studentDashboard");
  const tGroups = useTranslations("groups");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [schedule, setSchedule] = useState<Record<number, SessionEntry[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const today = new Date();
  const weekDays = getDaysOfWeek(today);

  useEffect(() => {
    fetch("/api/student/me")
      .then((r) => r.json())
      .then((d) => {
        setSchedule(d.schedule || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sessions = schedule ? schedule[selectedDay] || [] : [];

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff]"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-3 px-5 pb-1 pt-10">
        <button
          onClick={() => router.push(`/${locale}/dashboard`)}
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
          {t("mySchedule")}
        </h1>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6 scrollbar-hide">
        {/* Day pills */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((wd) => {
              const isToday = isSameDay(wd.date, today);
              const isSelected = selectedDay === wd.day;
              const hasSess = schedule ? (schedule[wd.day] || []).length > 0 : false;

              return (
                <button
                  key={wd.day}
                  onClick={() => setSelectedDay(wd.day)}
                  className="flex flex-col items-center gap-0.5 rounded-xl py-2 transition-[transform,box-shadow] duration-[80ms]"
                  style={{
                    background: isSelected
                      ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                      : isToday ? "rgba(124,58,237,0.08)" : "transparent",
                    transform: `translateY(${isSelected ? 3 : 0}px)`,
                    boxShadow: isSelected
                      ? "0 0px 0 #5b21b6, 0 1px 3px -1px rgba(124,58,237,0.5)"
                      : isToday ? "0 3px 0 #ddd6fe" : "none",
                  }}
                >
                  <span className={`text-[9px] font-bold ${isSelected ? "text-white/70" : "text-[#1e1b4b]/40"}`}>
                    {tGroups(`day${wd.day}Short`)}
                  </span>
                  <span className={`text-[14px] font-extrabold ${isSelected ? "text-white" : isToday ? "text-[#7c3aed]" : "text-[#1e1b4b]"}`}>
                    {wd.date.getDate()}
                  </span>
                  {hasSess && !isSelected && (
                    <div className="h-1 w-1 rounded-full bg-[#7c3aed]" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7c3aed] border-t-transparent" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl bg-white p-6 text-center" style={{ boxShadow: "0 2px 0 #e9e5f5" }}>
              <p className="text-[12px] font-semibold text-[#1e1b4b]/40">{t("noGroups")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((session, i) => {
                const levelDef = getLevelDef(session.level);
                return (
                  <div
                    key={i}
                    className="rounded-2xl bg-white p-4"
                    style={{ boxShadow: "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-white"
                        style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", boxShadow: "0 2px 0 #5b21b6" }}
                      >
                        <span className="text-[11px] font-black leading-none">{session.start_time}</span>
                        <span className="text-[8px] font-semibold text-white/50">{session.end_time}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-extrabold text-[#1e1b4b]">
                          {session.group_name}
                        </p>
                        <p className="text-[11px] font-semibold text-[#1e1b4b]/40">
                          {levelDef?.label || session.level}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <div className="h-24 shrink-0" />
      <BottomNav active="home" role="eleve" />
    </motion.main>
  );
}
