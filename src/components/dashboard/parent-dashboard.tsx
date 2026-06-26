"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import type { User } from "@supabase/supabase-js";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

function getGreetingKey(): "goodMorning" | "goodAfternoon" | "goodEvening" {
  const h = new Date().getHours();
  if (h < 12) return "goodMorning";
  if (h < 18) return "goodAfternoon";
  return "goodEvening";
}

export function ParentDashboard({ user }: { user: User }) {
  const t = useTranslations("parentDashboard");
  const tDash = useTranslations("dashboard");
  const fullName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const greetingKey = useMemo(() => getGreetingKey(), []);

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#fff7ed]"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="px-5 pb-1 pt-10">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 18,
              delay: 0.15,
            }}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-[14px] font-black text-white"
            style={{
              background: "linear-gradient(135deg, #fb923c, #ea580c)",
              boxShadow: "0 3px 0 #c2410c, 0 6px 12px -4px rgba(249,115,22,0.4)",
            }}
          >
            {initials || "P"}
          </motion.div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-extrabold leading-tight text-[#1e1b4b] truncate">
              {tDash(greetingKey, { name: fullName })}
            </h1>
            <p className="text-[11px] font-semibold text-[#1e1b4b]/40">
              {t("subtitle")}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-28 pt-4">
        <motion.div
          variants={fadeUp}
          className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-white px-6 py-10 text-center"
          style={{
            boxShadow:
              "0 5px 0 #fed7aa, 0 18px 48px -12px rgba(249,115,22,0.18)",
          }}
        >
          <div
            className="absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, rgba(249,115,22,0.5), transparent 70%)",
            }}
          />

          {/* Illustration */}
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.3 }}
            className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl"
            style={{
              background: "linear-gradient(150deg, #fdba74 0%, #f97316 60%, #ea580c 100%)",
              boxShadow: "0 5px 0 #c2410c, 0 10px 24px -8px rgba(249,115,22,0.5)",
            }}
          >
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
              <motion.g
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 350, damping: 16, delay: 0.45 }}
              >
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" fill="none" />
                <path
                  d="M12 7.5v5l3 2"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.g>
            </svg>
          </motion.div>

          {/* Badge */}
          <motion.span
            variants={fadeUp}
            className="relative mt-5 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold"
            style={{
              background: "rgba(249,115,22,0.1)",
              color: "#ea580c",
            }}
          >
            {t("comingBadge")}
          </motion.span>

          <motion.h2
            variants={fadeUp}
            className="relative mt-3 text-[18px] font-extrabold leading-snug text-[#1e1b4b]"
          >
            {t("comingTitle")}
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="relative mt-2.5 text-[13px] font-semibold leading-relaxed text-[#1e1b4b]/50"
          >
            {t("comingDesc")}
          </motion.p>
        </motion.div>
      </div>

      <BottomNav active="home" role="parent" />
    </motion.main>
  );
}
