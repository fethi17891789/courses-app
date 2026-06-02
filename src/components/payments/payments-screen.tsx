"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { getLevelDef } from "@/lib/levels";

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

type DebtEntry = {
  student_id: string;
  student_name: string;
  student_level: string;
  group_id: string;
  group_name: string;
  total_due: number;
  total_paid: number;
  debt: number;
};

type PaymentsData = {
  groups: GroupOption[];
  unpaid_count: number;
  debts: DebtEntry[];
};

export function PaymentsScreen() {
  const t = useTranslations("payments");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("");

  useEffect(() => {
    const params = selectedGroup ? `?group=${selectedGroup}` : "";
    fetch(`/api/payments/overview${params}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedGroup]);

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
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7c3aed] border-t-transparent" />
          </div>
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
                  onChange={(e) => {
                    setSelectedGroup(e.target.value);
                    setLoading(true);
                  }}
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
                  {data.debts.map((d, i) => (
                    <button
                      key={`${d.student_id}-${d.group_id}-${i}`}
                      onClick={() => router.push(`/${locale}/students/${d.student_id}`)}
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
                          {d.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold text-[#1e1b4b]">
                            {d.student_name}
                          </p>
                          <p className="text-[10px] font-semibold text-[#1e1b4b]/40">
                            {d.group_name} - {getLevelDef(d.student_level)?.label || d.student_level}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[14px] font-extrabold text-[#ef4444]">
                            {d.debt} DA
                          </p>
                          <p className="text-[9px] font-semibold text-[#1e1b4b]/30">
                            {d.total_paid}/{d.total_due} DA
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        ) : null}
      </div>

      <div className="h-24 shrink-0" />
      <BottomNav active="payments" />
    </motion.main>
  );
}
