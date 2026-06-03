"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
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
  session_day: number;
  session_date: string;
  groups: { name: string } | null;
};

type Payment = {
  id: string;
  amount: number;
  session_date: string;
  groups: { name: string } | null;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[12px] font-bold uppercase text-[#1e1b4b]/30">
      {children}
    </p>
  );
}

export function StudentHistoryScreen() {
  const t = useTranslations("studentDashboard");
  const tGroups = useTranslations("groups");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [absences, setAbsences] = useState<Absence[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"absences" | "payments">("absences");

  useEffect(() => {
    fetch("/api/student/me")
      .then((r) => r.json())
      .then((d) => {
        setAbsences(d.absences || []);
        setPayments(d.payments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0fdf4]"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-3 px-5 pb-1 pt-10">
        <button
          onClick={() => router.push(`/${locale}/dashboard`)}
          className="btn-push flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
            "--push-shadow": "#bbf7d0",
            "--push-glow": "rgba(34,197,94,0.1)",
          } as React.CSSProperties}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">
          {t("myPayments")}
        </h1>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6 scrollbar-hide">
        {/* Tab toggle */}
        <motion.div variants={fadeUp}>
          <div
            className="relative grid grid-cols-2 rounded-xl p-1 text-[12px] font-extrabold"
            style={{ backgroundColor: "rgba(34,197,94,0.07)" }}
          >
            {(["absences", "payments"] as const).map((t2) => (
              <button
                key={t2}
                onClick={() => setTab(t2)}
                className="relative z-10 rounded-lg py-2.5 transition-colors duration-200"
                style={{ color: tab === t2 ? "#ffffff" : "#1e1b4b80" }}
              >
                {t2 === "absences" ? t("myAbsences") : t("myPayments")}
              </button>
            ))}
            <div
              className="absolute inset-y-1 w-[calc(50%-0.25rem)] z-0 overflow-hidden rounded-lg transition-[left,box-shadow] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{
                left: tab === "absences" ? "0.25rem" : "calc(50%)",
                background: tab === "absences"
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : "linear-gradient(135deg, #22c55e, #16a34a)",
                boxShadow: tab === "absences"
                  ? "0 3px 0 #b91c1c, 0 6px 12px -2px rgba(239,68,68,0.5)"
                  : "0 3px 0 #15803d, 0 6px 12px -2px rgba(34,197,94,0.5)",
              }}
            />
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#22c55e] border-t-transparent" />
          </div>
        ) : tab === "absences" ? (
          <motion.div variants={fadeUp} className="mt-4">
            {absences.length === 0 ? (
              <div className="rounded-xl bg-white p-6 text-center" style={{ boxShadow: "0 2px 0 #bbf7d0" }}>
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 2px 0 #15803d" }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <p className="text-[13px] font-extrabold text-[#1e1b4b]">{t("noAbsences")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {absences.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl bg-white px-4 py-3"
                    style={{ boxShadow: "0 2px 0 #bbf7d0" }}
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
                        {tGroups(`day${a.session_day}Short`)} - {new Date(a.session_date).toLocaleDateString(locale === "ar" ? "ar-DZ" : "fr-FR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="mt-4">
            {payments.length === 0 ? (
              <div className="rounded-xl bg-white p-6 text-center" style={{ boxShadow: "0 2px 0 #bbf7d0" }}>
                <p className="text-[13px] font-extrabold text-[#1e1b4b]">{t("noPayments")}</p>
              </div>
            ) : (
              <>
                <div
                  className="mb-3 rounded-xl bg-white px-4 py-3"
                  style={{ boxShadow: "0 2px 0 #bbf7d0" }}
                >
                  <p className="text-[11px] font-bold text-[#1e1b4b]/40">{t("totalPaid")}</p>
                  <p className="text-[18px] font-extrabold text-[#22c55e]">{totalPaid} DA</p>
                </div>
                <div className="flex flex-col gap-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl bg-white px-4 py-3"
                      style={{ boxShadow: "0 2px 0 #bbf7d0" }}
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
                          {new Date(p.session_date).toLocaleDateString(locale === "ar" ? "ar-DZ" : "fr-FR")}
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
        )}
      </div>

      <div className="h-24 shrink-0" />
      <BottomNav active="settings" role="eleve" />
    </motion.main>
  );
}
