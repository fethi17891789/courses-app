"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getCache, setCache } from "@/lib/page-cache";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { getLevelDef } from "@/lib/levels";
import { ListSkeleton } from "@/components/ui/skeleton";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

type GroupOption = { id: string; name: string };

type UnpaidSession = {
  date: string;
  day: number;
  amount: number;
};

type DebtEntry = {
  student_id: string;
  student_name: string;
  student_level: string;
  group_id: string;
  group_name: string;
  total_due: number;
  total_paid: number;
  debt: number;
  unpaid_sessions: UnpaidSession[];
};

type PaymentsData = {
  groups: GroupOption[];
  unpaid_count: number;
  debts: DebtEntry[];
};

function DebtCard({
  entry,
  onTap,
  onLongPress,
  wiggling,
}: {
  entry: DebtEntry;
  onTap: () => void;
  onLongPress: () => void;
  wiggling: boolean;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
      onLongPress();
    }, 500);
  }, [onLongPress]);

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!didLongPress.current && !wiggling) {
      onTap();
    }
  }, [onTap, wiggling]);

  const handlePointerLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <motion.div
      animate={wiggling ? { rotate: [-1.5, 1.5, -1.5] } : { rotate: 0 }}
      transition={wiggling ? { repeat: Infinity, duration: 0.3 } : { duration: 0.15 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="btn-push w-full rounded-xl bg-white px-4 py-3 text-left"
      style={{
        "--push-shadow": "#e9e5f5",
        "--push-glow": "rgba(30,27,75,0.08)",
      } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 2px 0 #c2410c" }}
        >
          {entry.student_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-[#1e1b4b]">
            {entry.student_name}
          </p>
          <p className="text-[10px] font-semibold text-[#1e1b4b]/40">
            {entry.group_name} - {getLevelDef(entry.student_level)?.label || entry.student_level}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-extrabold text-[#ef4444]">
            {entry.debt} DA
          </p>
          <p className="text-[9px] font-semibold text-[#1e1b4b]/30">
            {entry.unpaid_sessions.length} seance{entry.unpaid_sessions.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function PaymentsScreen() {
  const t = useTranslations("payments");
  const tGroups = useTranslations("groups");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [data, setData] = useState<PaymentsData | null>(() => getCache<PaymentsData>("payments:all"));
  const [loading, setLoading] = useState(() => getCache<PaymentsData>("payments:all") === null);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [activeDebt, setActiveDebt] = useState<DebtEntry | null>(null);
  const [wiggleId, setWiggleId] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  function fetchData() {
    const key = `payments:${selectedGroup || "all"}`;
    const cached = getCache<PaymentsData>(key);
    if (cached) { setData(cached); setLoading(false); }
    else setLoading(true);
    const params = selectedGroup ? `?group=${selectedGroup}` : "";
    fetch(`/api/payments/overview${params}`)
      .then((res) => res.json())
      .then((d) => {
        setCache(key, d);
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, [selectedGroup]);

  function handleLongPress(entry: DebtEntry) {
    const key = `${entry.student_id}-${entry.group_id}`;
    setWiggleId(key);
    setActiveDebt(entry);
  }

  async function handlePaySession(session: UnpaidSession) {
    if (!activeDebt || paying) return;
    const key = `${session.date}-${session.day}`;
    setPaying(key);

    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group_id: activeDebt.group_id,
        student_id: activeDebt.student_id,
        amount: session.amount,
      }),
    });

    // Update local state
    const updatedSessions = activeDebt.unpaid_sessions.filter((s) => s !== session);
    const updatedDebt = { ...activeDebt, unpaid_sessions: updatedSessions, debt: activeDebt.debt - session.amount, total_paid: activeDebt.total_paid + session.amount };

    if (updatedSessions.length === 0) {
      setActiveDebt(null);
      setWiggleId(null);
    } else {
      setActiveDebt(updatedDebt);
    }

    // Update data
    if (data) {
      const newDebts = updatedSessions.length === 0
        ? data.debts.filter((d) => !(d.student_id === activeDebt.student_id && d.group_id === activeDebt.group_id))
        : data.debts.map((d) => d.student_id === activeDebt.student_id && d.group_id === activeDebt.group_id ? updatedDebt : d);
      setData({ ...data, debts: newDebts, unpaid_count: newDebts.length });
    }

    setPaying(null);
  }

  function closePopup() {
    setActiveDebt(null);
    setWiggleId(null);
  }

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff]"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="px-5 pb-1 pt-10">
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">
          {t("title")}
        </h1>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 scrollbar-hide">
        {loading ? (
          <ListSkeleton count={4} />
        ) : data ? (
          <>
            {/* Unpaid count */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl bg-white p-5"
              style={{ boxShadow: "0 4px 0 #e9e5f5, 0 12px 32px -8px rgba(30,27,75,0.12)" }}
            >
              <p className="text-[11px] font-bold uppercase text-[#1e1b4b]/30">
                {t("unpaidStudents")}
              </p>
              <p className="mt-1 text-[28px] font-extrabold" style={{ color: data.unpaid_count > 0 ? "#ef4444" : "#22c55e" }}>
                {data.unpaid_count}
              </p>
            </motion.div>

            {/* Group filter */}
            {data.groups.length > 1 && (
              <motion.div variants={fadeUp} className="mt-4">
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#ddd6fe] bg-[#f9f7ff] px-3 py-2.5 text-[12px] font-extrabold text-[#1e1b4b] outline-none focus:border-[#7c3aed]"
                >
                  <option value="">{t("allGroups")}</option>
                  {data.groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </motion.div>
            )}

            {/* Debts list */}
            <motion.div variants={fadeUp} className="mt-4">
              {data.debts.length === 0 ? (
                <div className="rounded-xl bg-white p-6 text-center" style={{ boxShadow: "0 2px 0 #e9e5f5" }}>
                  <div
                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 2px 0 #15803d" }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <p className="text-[13px] font-extrabold text-[#1e1b4b]">{t("allPaid")}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#1e1b4b]/40">{t("allPaidDesc")}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.debts.map((d, i) => {
                    const key = `${d.student_id}-${d.group_id}`;
                    return (
                      <DebtCard
                        key={`${key}-${i}`}
                        entry={d}
                        onTap={() => router.push(`/${locale}/students/${d.student_id}`)}
                        onLongPress={() => handleLongPress(d)}
                        wiggling={wiggleId === key}
                      />
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        ) : null}
      </div>

      {/* Unpaid sessions popup */}
      <AnimatePresence>
        {activeDebt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
            onClick={closePopup}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-2xl bg-white px-5 pb-8 pt-5"
              style={{ boxShadow: "0 -8px 32px -8px rgba(30,27,75,0.15)", maxHeight: "70dvh" }}
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[15px] font-extrabold text-[#1e1b4b]">
                  {activeDebt.student_name}
                </p>
                <button
                  onClick={closePopup}
                  className="btn-push rounded-lg bg-[#f0ecff] px-2.5 py-1 text-[11px] font-bold text-[#7c3aed]"
                  style={{ "--push-shadow": "#ddd6fe", "--push-glow": "rgba(124,58,237,0.1)", "--push-depth": "2px" } as React.CSSProperties}
                >
                  {t("close")}
                </button>
              </div>
              <p className="mb-4 text-[11px] font-semibold text-[#1e1b4b]/40">
                {activeDebt.group_name} - {t("unpaidSessions")}
              </p>

              <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: "calc(70dvh - 120px)" }}>
                <div className="flex flex-col gap-2">
                  {activeDebt.unpaid_sessions.map((session, i) => {
                    const sessionKey = `${session.date}-${session.day}`;
                    const isPaying = paying === sessionKey;
                    const dateLabel = session.day >= 0
                      ? `${tGroups(`day${session.day}Short`)} - ${new Date(session.date).toLocaleDateString(locale === "ar" ? "ar-DZ" : "fr-FR")}`
                      : new Date(session.date + "-01").toLocaleDateString(locale === "ar" ? "ar-DZ" : "fr-FR", { month: "long", year: "numeric" });

                    return (
                      <div
                        key={`${sessionKey}-${i}`}
                        className="flex items-center gap-3 rounded-xl bg-[#f9f7ff] px-4 py-3"
                        style={{ boxShadow: "0 2px 0 #e9e5f5" }}
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-black text-white"
                          style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 2px 0 #b91c1c" }}
                        >
                          !
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-bold text-[#1e1b4b]">
                            {session.amount} DA
                          </p>
                          <p className="text-[10px] font-semibold text-[#1e1b4b]/40">
                            {dateLabel}
                          </p>
                        </div>
                        <button
                          onClick={() => handlePaySession(session)}
                          disabled={isPaying}
                          className="btn-push shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-extrabold text-white disabled:opacity-50"
                          style={{
                            background: "linear-gradient(135deg, #22c55e, #16a34a)",
                            "--push-shadow": "#15803d",
                            "--push-glow": "rgba(34,197,94,0.3)",
                            "--push-depth": "2px",
                          } as React.CSSProperties}
                        >
                          {isPaying ? "..." : t("markPaid")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-24 shrink-0" />
      <BottomNav active="payments" />
    </motion.main>
  );
}
