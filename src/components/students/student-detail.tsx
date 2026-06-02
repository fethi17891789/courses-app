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

type Absence = {
  id: string;
  group_id: string;
  session_day: number;
  session_date: string;
  groups: { name: string } | null;
};

type Payment = {
  id: string;
  group_id: string;
  amount: number;
  session_date: string;
  session_day: number | null;
  groups: { name: string } | null;
};

type StudentData = {
  id: string;
  full_name: string;
  phone: string | null;
  parent_phone: string | null;
  level: string;
  section: string | null;
  notes: string | null;
  status: string;
  group_members: {
    group_id: string;
    enrolled_sessions: number[] | null;
    groups: { name: string; level: string; schedules: { day: number; start_time: string; end_time: string }[]; price: number; payment_mode: string } | null;
  }[];
  absences: Absence[];
  payments: Payment[];
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[12px] font-bold uppercase text-[#1e1b4b]/30">
      {children}
    </p>
  );
}

export function StudentDetail({ studentId }: { studentId: string }) {
  const t = useTranslations("students");
  const tGroups = useTranslations("groups");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        setStudent(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f0ecff]">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7c3aed] border-t-transparent" />
      </main>
    );
  }

  if (!student) return null;

  const levelDef = getLevelDef(student.level);
  const initials = student.full_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const totalPaid = student.payments.reduce((sum, p) => sum + Number(p.amount), 0);

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
          onClick={() => router.back()}
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
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-extrabold text-[#1e1b4b]">
            {student.full_name}
          </h1>
          <p className="text-[12px] font-semibold text-[#1e1b4b]/40">
            {levelDef?.label || student.level}
            {student.section ? ` - ${student.section}` : ""}
          </p>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 scrollbar-hide">
        {/* Avatar + info card */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl bg-white p-5"
          style={{ boxShadow: "0 4px 0 #e9e5f5, 0 12px 32px -8px rgba(30,27,75,0.12)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[18px] font-black text-white"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                boxShadow: "0 3px 0 #5b21b6",
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              {student.phone && (
                <p className="text-[12px] font-semibold text-[#1e1b4b]/60">{student.phone}</p>
              )}
              {student.parent_phone && (
                <p className="text-[11px] font-semibold text-[#1e1b4b]/40">{t("parentPhone")}: {student.parent_phone}</p>
              )}
            </div>
          </div>
          {student.notes && (
            <p className="mt-3 rounded-xl bg-[#f9f7ff] px-3 py-2 text-[11px] font-semibold text-[#1e1b4b]/50">
              {student.notes}
            </p>
          )}
        </motion.div>

        {/* Groups */}
        {student.group_members.length > 0 && (
          <motion.div variants={fadeUp} className="mt-5">
            <SectionTitle>{t("memberOf")}</SectionTitle>
            <div className="flex flex-col gap-2">
              {student.group_members.map((gm) => (
                <div
                  key={gm.group_id}
                  className="rounded-xl bg-white px-4 py-3"
                  style={{ boxShadow: "0 2px 0 #e9e5f5" }}
                >
                  <p className="text-[13px] font-bold text-[#1e1b4b]">
                    {gm.groups?.name || gm.group_id.slice(0, 8)}
                  </p>
                  <p className="text-[11px] font-semibold text-[#1e1b4b]/40">
                    {gm.groups?.price} DA - {tGroups(gm.groups?.payment_mode === "per_session" ? "perSession" : gm.groups?.payment_mode === "weekly" ? "weekly" : "monthly")}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Absences */}
        <motion.div variants={fadeUp} className="mt-5">
          <SectionTitle>{t("absences")} ({student.absences.length})</SectionTitle>
          {student.absences.length === 0 ? (
            <div className="rounded-xl bg-white p-4 text-center" style={{ boxShadow: "0 2px 0 #e9e5f5" }}>
              <p className="text-[12px] font-semibold text-[#1e1b4b]/40">{t("noAbsences")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {student.absences.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl bg-white px-4 py-3"
                  style={{ boxShadow: "0 2px 0 #e9e5f5" }}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-black text-white"
                    style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 2px 0 #b91c1c" }}
                  >
                    A
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-[#1e1b4b]">
                      {a.groups?.name || ""}
                    </p>
                    <p className="text-[10px] font-semibold text-[#1e1b4b]/40">
                      {tGroups(`day${a.session_day}Short`)} - {new Date(a.session_date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Payments */}
        <motion.div variants={fadeUp} className="mt-5">
          <SectionTitle>{t("paymentsHistory")}</SectionTitle>
          {student.payments.length === 0 ? (
            <div className="rounded-xl bg-white p-4 text-center" style={{ boxShadow: "0 2px 0 #e9e5f5" }}>
              <p className="text-[12px] font-semibold text-[#1e1b4b]/40">{t("noPayments")}</p>
            </div>
          ) : (
            <>
              <div
                className="mb-2 rounded-xl bg-white px-4 py-3"
                style={{ boxShadow: "0 2px 0 #e9e5f5" }}
              >
                <p className="text-[11px] font-bold text-[#1e1b4b]/40">{t("totalPaid")}</p>
                <p className="text-[18px] font-extrabold text-[#22c55e]">{totalPaid} DA</p>
              </div>
              <div className="flex flex-col gap-2">
                {student.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl bg-white px-4 py-3"
                    style={{ boxShadow: "0 2px 0 #e9e5f5" }}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-black text-white"
                      style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 2px 0 #15803d" }}
                    >
                      DA
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-[#1e1b4b]">
                        {p.groups?.name || ""}
                      </p>
                      <p className="text-[10px] font-semibold text-[#1e1b4b]/40">
                        {new Date(p.session_date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <span className="text-[13px] font-extrabold text-[#22c55e]">
                      {p.amount} DA
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      <div className="h-24 shrink-0" />
      <BottomNav active="students" />
    </motion.main>
  );
}
