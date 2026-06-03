"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
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

function ActionCard({
  gradient,
  shadow3d,
  shadowGlow,
  icon,
  label,
  description,
  pressed,
  onPress,
  onRelease,
  onClick,
  className = "",
}: {
  gradient: string;
  shadow3d: string;
  shadowGlow: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  pressed: boolean;
  onPress: () => void;
  onRelease: () => void;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onPointerDown={onPress}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      onClick={onClick}
      className={`relative flex items-center gap-3 overflow-hidden rounded-xl p-4 text-left transition-[transform,box-shadow] duration-[80ms] ease-out ${className}`}
      style={{
        background: gradient,
        transform: `translateY(${pressed ? 4 : 0}px)`,
        boxShadow: pressed
          ? `0 0px 0 ${shadow3d}, 0 2px 4px -2px ${shadowGlow}`
          : `0 4px 0 ${shadow3d}, 0 8px 20px -6px ${shadowGlow}`,
      }}
    >
      <div
        className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.6), transparent 70%)",
        }}
      />
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20"
      >
        {icon}
      </motion.div>
      <div className="relative min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold text-white">
          {label}
        </span>
        <span className="block text-[11px] font-semibold text-white/60">
          {description}
        </span>
      </div>
    </button>
  );
}

export function StudentDashboard({ user }: { user: User }) {
  const t = useTranslations("studentDashboard");
  const tDash = useTranslations("dashboard");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const fullName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const [pressed, setPressed] = useState<string | null>(null);

  const greetingKey = useMemo(() => getGreetingKey(), []);

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff]"
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
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              boxShadow: "0 3px 0 #15803d, 0 6px 12px -4px rgba(34,197,94,0.4)",
            }}
          >
            {initials || "E"}
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

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2 scrollbar-hide">
        {/* Join group - main action */}
        <motion.div variants={fadeUp}>
          <ActionCard
            gradient="linear-gradient(150deg, #86efac 0%, #22c55e 60%, #16a34a 100%)"
            shadow3d="#15803d"
            shadowGlow="rgba(34,197,94,0.4)"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <motion.g
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 16, delay: 0.35 }}
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4 2a4 4 0 0 0-4 4v12a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4V6a4 4 0 0 0-4-4H4zm8 4a1.5 1.5 0 0 1 1.5 1.5v3h3a1.5 1.5 0 0 1 0 3h-3v3a1.5 1.5 0 0 1-3 0v-3h-3a1.5 1.5 0 0 1 0-3h3v-3A1.5 1.5 0 0 1 12 6z"
                    fill="white"
                  />
                </motion.g>
              </svg>
            }
            label={t("joinGroup")}
            description={t("joinGroupDesc")}
            pressed={pressed === "join"}
            onPress={() => setPressed("join")}
            onRelease={() => setPressed(null)}
            onClick={() => router.push(`/${locale}/join`)}
            className="w-full"
          />
        </motion.div>

        {/* Schedule */}
        <motion.div variants={fadeUp} className="mt-3">
          <ActionCard
            gradient="linear-gradient(150deg, #a78bfa 0%, #7c3aed 60%, #6d28d9 100%)"
            shadow3d="#5b21b6"
            shadowGlow="rgba(124,58,237,0.4)"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <motion.g
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 16, delay: 0.35 }}
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6 2a1 1 0 0 1 1 1v1h10V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1zM3 10v9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-9H3z"
                    fill="white"
                  />
                </motion.g>
              </svg>
            }
            label={t("mySchedule")}
            description={t("myScheduleDesc")}
            pressed={pressed === "schedule"}
            onPress={() => setPressed("schedule")}
            onRelease={() => setPressed(null)}
            onClick={() => router.push(`/${locale}/student/schedule`)}
            className="w-full"
          />
        </motion.div>

        {/* Payments */}
        <motion.div variants={fadeUp} className="mt-3">
          <ActionCard
            gradient="linear-gradient(150deg, #fdba74 0%, #f97316 60%, #ea580c 100%)"
            shadow3d="#c2410c"
            shadowGlow="rgba(249,115,22,0.4)"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <motion.g
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 16, delay: 0.35 }}
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3 5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5zm2 0a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2H5V5zm0 5h14v3h-4.5a2.5 2.5 0 0 0 0 5H19v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-10z"
                    fill="white"
                  />
                  <circle cx="16" cy="15.5" r="1.5" fill="white" />
                </motion.g>
              </svg>
            }
            label={t("myPayments")}
            description={t("myPaymentsDesc")}
            pressed={pressed === "payments"}
            onPress={() => setPressed("payments")}
            onRelease={() => setPressed(null)}
            onClick={() => router.push(`/${locale}/student/history`)}
            className="w-full"
          />
        </motion.div>

        <div className="h-28" />
      </div>

      <BottomNav active="home" role="eleve" />
    </motion.main>
  );
}
