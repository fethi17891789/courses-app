"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { getLevelDef } from "@/lib/levels";
import { getHoliday } from "@/lib/holidays";
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
  group_id: string;
  group_name: string;
  level: string;
  section: string | null;
  start_time: string;
  end_time: string;
  price: number;
  payment_mode: string;
  member_count: number;
  is_payment_session: boolean;
};

function getDaysOfWeek(baseDate: Date): { date: Date; day: number }[] {
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

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function ScheduleScreen() {
  const t = useTranslations("schedule");
  const tGroups = useTranslations("groups");
  const tHolidays = useTranslations("holidays");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay());
  const [hasSessions, setHasSessions] = useState<Record<number, boolean>>({});
  const todayRef = useRef(new Date());

  const baseDate = new Date(todayRef.current);
  baseDate.setDate(baseDate.getDate() + currentWeekOffset * 7);
  const weekDays = getDaysOfWeek(baseDate);
  const today = todayRef.current;

  const selectedDate = weekDays.find((w) => w.day === selectedDayIndex)?.date || today;

  useEffect(() => {
    setLoading(true);
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    fetch(`/api/schedule?date=${dateStr}`)
      .then((r) => r.json())
      .then((d) => {
        setSessions(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDate.toISOString().slice(0, 10)]);

  // Check which days have sessions (lightweight: just check group schedules)
  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((groups: any[]) => {
        const map: Record<number, boolean> = {};
        for (let d = 0; d < 7; d++) map[d] = false;
        for (const g of groups) {
          for (const s of g.schedules || []) {
            map[s.day] = true;
          }
        }
        setHasSessions(map);
      })
      .catch(() => {});
  }, []);

  const monthLabel = weekDays[3]?.date.toLocaleDateString(locale === "ar" ? "ar-DZ" : "fr-FR", { month: "long", year: "numeric" });

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
          {t("title")}
        </h1>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6 scrollbar-hide">
        {/* Week navigation */}
        <motion.div variants={fadeUp}>
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
              className="btn-push flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                "--push-shadow": "#e9e5f5",
                "--push-glow": "rgba(124,58,237,0.1)",
                "--push-depth": "2px",
              } as React.CSSProperties}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="text-center">
              <p className="text-[13px] font-extrabold capitalize text-[#1e1b4b]">{monthLabel}</p>
              {currentWeekOffset !== 0 && (
                <button
                  onClick={() => {
                    setCurrentWeekOffset(0);
                    setSelectedDayIndex(today.getDay());
                  }}
                  className="text-[10px] font-bold text-[#7c3aed]"
                >
                  {t("today")}
                </button>
              )}
            </div>
            <button
              onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
              className="btn-push flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                "--push-shadow": "#e9e5f5",
                "--push-glow": "rgba(124,58,237,0.1)",
                "--push-depth": "2px",
              } as React.CSSProperties}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Day pills */}
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((wd) => {
              const isToday = isSameDay(wd.date, today);
              const isSelected = selectedDayIndex === wd.day;
              const dayHasSessions = hasSessions[wd.day] || false;
              const dayHoliday = getHoliday(wd.date);

              return (
                <button
                  key={wd.day}
                  onClick={() => setSelectedDayIndex(wd.day)}
                  className="flex flex-col items-center gap-0.5 rounded-xl py-2 transition-[transform,box-shadow] duration-[80ms]"
                  style={{
                    background: isSelected
                      ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                      : isToday
                        ? "rgba(124,58,237,0.08)"
                        : "transparent",
                    transform: `translateY(${isSelected ? 3 : 0}px)`,
                    boxShadow: isSelected
                      ? "0 0px 0 #5b21b6, 0 1px 3px -1px rgba(124,58,237,0.5)"
                      : isToday
                        ? "0 3px 0 #ddd6fe"
                        : "none",
                  }}
                >
                  <span className={`text-[9px] font-bold ${isSelected ? "text-white/70" : "text-[#1e1b4b]/40"}`}>
                    {tGroups(`day${wd.day}Short`)}
                  </span>
                  <span className={`text-[14px] font-extrabold ${isSelected ? "text-white" : isToday ? "text-[#7c3aed]" : "text-[#1e1b4b]"}`}>
                    {wd.date.getDate()}
                  </span>
                  {!isSelected && (dayHoliday ? (
                    <div className="h-1 w-1 rounded-full bg-[#f59e0b]" />
                  ) : dayHasSessions ? (
                    <div className="h-1 w-1 rounded-full bg-[#7c3aed]" />
                  ) : null)}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Holiday banner for the selected day */}
        {(() => {
          const holiday = getHoliday(selectedDate);
          if (!holiday) return null;
          return (
            <motion.div
              variants={fadeUp}
              className="mt-4 rounded-2xl p-4"
              style={{
                background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                boxShadow: "0 3px 0 #fbbf24, 0 6px 16px -4px rgba(251,191,36,0.3)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/50">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase text-[#b45309]/70">
                    {tHolidays("holiday")}
                  </p>
                  <p className="text-[14px] font-extrabold text-[#92400e]">
                    {tHolidays(holiday.key)}
                    {holiday.lunar ? ` (${tHolidays("approx")})` : ""}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Sessions list */}
        <motion.div variants={fadeUp} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7c3aed] border-t-transparent" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl bg-white p-6 text-center" style={{ boxShadow: "0 2px 0 #e9e5f5" }}>
              <p className="text-[12px] font-semibold text-[#1e1b4b]/40">{t("noSessions")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((session, i) => {
                const levelDef = getLevelDef(session.level);
                const isPayment = session.is_payment_session;

                return (
                  <button
                    key={`${session.group_id}-${i}`}
                    onClick={() => router.push(`/${locale}/groups/${session.group_id}`)}
                    className="btn-push w-full rounded-2xl bg-white p-4 text-left"
                    style={{
                      "--push-shadow": "#e9e5f5",
                      "--push-glow": "rgba(30,27,75,0.08)",
                    } as React.CSSProperties}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-white"
                        style={{
                          background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                          boxShadow: "0 2px 0 #5b21b6",
                        }}
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
                          {session.section ? ` - ${session.section}` : ""}
                          {" - "}{session.member_count} {tGroups("students", { count: session.member_count }).split(" ").pop()}
                        </p>
                      </div>
                      {isPayment && (
                        <span
                          className="shrink-0 rounded-lg px-2 py-1 text-[9px] font-bold text-[#22c55e]"
                          style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}
                        >
                          {session.price} DA
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <div className="h-24 shrink-0" />
      <BottomNav active="home" />
    </motion.main>
  );
}
