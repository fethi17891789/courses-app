"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [showPayment, setShowPayment] = useState(false);
  const [payGroupId, setPayGroupId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

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

        {/* Add payment button */}
        {student.group_members.length > 0 && (
          <motion.div variants={fadeUp} className="mt-4">
            <button
              onClick={() => {
                setPayGroupId(student.group_members[0].group_id);
                setPayAmount(String(student.group_members[0].groups?.price || ""));
                setShowPayment(true);
                setPaySuccess(false);
              }}
              className="btn-push flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-extrabold text-white"
              style={{
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                "--push-shadow": "#15803d",
                "--push-glow": "rgba(34,197,94,0.4)",
              } as React.CSSProperties}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              {t("addPayment")}
            </button>
          </motion.div>
        )}
      </div>

      {/* Payment overlay */}
      <AnimatePresence>
        {showPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
            onClick={() => setShowPayment(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-2xl bg-white px-5 pb-8 pt-5"
              style={{ boxShadow: "0 -8px 32px -8px rgba(30,27,75,0.15)" }}
            >
              {paySuccess ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-4 text-center"
                >
                  <div
                    className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl"
                    style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 3px 0 #15803d" }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <p className="text-[14px] font-extrabold text-[#1e1b4b]">{t("paymentSaved")}</p>
                  <button
                    onClick={() => setShowPayment(false)}
                    className="btn-push mt-4 w-full rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed]"
                    style={{ "--push-shadow": "#ddd6fe", "--push-glow": "rgba(124,58,237,0.1)" } as React.CSSProperties}
                  >
                    {t("close")}
                  </button>
                </motion.div>
              ) : (
                <>
                  <p className="text-[15px] font-extrabold text-[#1e1b4b]">{t("addPayment")}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#1e1b4b]/40">{student.full_name}</p>

                  {/* Group select */}
                  {student.group_members.length > 1 && (
                    <div className="mt-4">
                      <p className="mb-1.5 text-[12px] font-bold text-[#1e1b4b]/50">{t("groups")}</p>
                      <select
                        value={payGroupId}
                        onChange={(e) => {
                          setPayGroupId(e.target.value);
                          const gm = student.group_members.find((m) => m.group_id === e.target.value);
                          setPayAmount(String(gm?.groups?.price || ""));
                        }}
                        className="w-full rounded-xl border-2 border-[#ddd6fe] bg-[#f9f7ff] px-3 py-2.5 text-[12px] font-extrabold text-[#1e1b4b] outline-none focus:border-[#7c3aed]"
                      >
                        {student.group_members.map((gm) => (
                          <option key={gm.group_id} value={gm.group_id}>
                            {gm.groups?.name || gm.group_id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Amount */}
                  <div className="mt-4">
                    <p className="mb-1.5 text-[12px] font-bold text-[#1e1b4b]/50">{t("amount")}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="h-12 flex-1 rounded-xl border-2 border-[#ddd6fe] bg-[#f9f7ff] px-4 text-[18px] font-extrabold text-[#22c55e] outline-none focus:border-[#7c3aed] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
                      />
                      <span className="text-[14px] font-extrabold text-[#1e1b4b]/40">DA</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowPayment(false)}
                      className="btn-push rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed]"
                      style={{ "--push-shadow": "#ddd6fe", "--push-glow": "rgba(124,58,237,0.1)" } as React.CSSProperties}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      onClick={async () => {
                        if (!payAmount || Number(payAmount) <= 0) return;
                        setPaying(true);
                        const res = await fetch("/api/payments", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            group_id: payGroupId,
                            student_id: student.id,
                            amount: Number(payAmount),
                          }),
                        });
                        if (res.ok) {
                          const newPayment = await res.json();
                          const gm = student.group_members.find((m) => m.group_id === payGroupId);
                          setStudent({
                            ...student,
                            payments: [{ ...newPayment, groups: gm?.groups ? { name: gm.groups.name } : null }, ...student.payments],
                          });
                          setPaySuccess(true);
                        }
                        setPaying(false);
                      }}
                      disabled={paying || !payAmount || Number(payAmount) <= 0}
                      className="btn-push rounded-xl py-3 text-[13px] font-extrabold text-white disabled:opacity-60"
                      style={{
                        background: "linear-gradient(135deg, #22c55e, #16a34a)",
                        "--push-shadow": "#15803d",
                        "--push-glow": "rgba(34,197,94,0.4)",
                      } as React.CSSProperties}
                    >
                      {paying ? "..." : t("confirm")}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-24 shrink-0" />
      <BottomNav active="students" />
    </motion.main>
  );
}
