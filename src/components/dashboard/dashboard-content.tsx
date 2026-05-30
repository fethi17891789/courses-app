"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { PageTransition } from "@/components/auth/page-transition";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import type { User } from "@supabase/supabase-js";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease },
  },
};

function getGreetingKey(): "goodMorning" | "goodAfternoon" | "goodEvening" {
  const h = new Date().getHours();
  if (h < 12) return "goodMorning";
  if (h < 18) return "goodAfternoon";
  return "goodEvening";
}

function ActionCard({
  id,
  gradient,
  shadow3d,
  shadowGlow,
  icon,
  label,
  description,
  pressed,
  onPress,
  onRelease,
  className = "",
}: {
  id: string;
  gradient: string;
  shadow3d: string;
  shadowGlow: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  pressed: boolean;
  onPress: () => void;
  onRelease: () => void;
  className?: string;
}) {
  return (
    <button
      onPointerDown={onPress}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
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

function StatCard({
  value,
  label,
  color,
  delay,
}: {
  value: number;
  label: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay }}
      className="flex flex-col items-center gap-1 rounded-xl bg-white px-2 py-3"
      style={{
        boxShadow: `0 3px 0 ${color}25, 0 6px 16px -4px ${color}15`,
      }}
    >
      <span
        className="text-[20px] font-extrabold leading-none"
        style={{ color }}
      >
        {value}
      </span>
      <span className="text-[10px] font-bold text-[#1e1b4b]/50">{label}</span>
    </motion.div>
  );
}

function QuizCard({
  pressed,
  onPress,
  onRelease,
  label,
  description,
  cta,
}: {
  pressed: boolean;
  onPress: () => void;
  onRelease: () => void;
  label: string;
  description: string;
  cta: string;
}) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl p-5"
      style={{
        background:
          "linear-gradient(150deg, #fde68a 0%, #fbbf24 60%, #f59e0b 100%)",
        boxShadow:
          "0 4px 0 #b45309, 0 8px 20px -6px rgba(251,191,36,0.4)",
      }}
    >
      <div
        className="absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.7), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex items-center gap-4">
        <div className="flex-1">
          <h3 className="text-[16px] font-extrabold text-white">{label}</h3>
          <p className="mt-1 text-[11px] font-semibold text-white/60">
            {description}
          </p>
          <button
            onPointerDown={onPress}
            onPointerUp={onRelease}
            onPointerLeave={onRelease}
            className="mt-3 inline-flex items-center rounded-xl bg-white px-4 py-2 text-[12px] font-extrabold transition-[transform,box-shadow] duration-[80ms]"
            style={{
              color: "#b45309",
              transform: `translateY(${pressed ? 3 : 0}px)`,
              boxShadow: pressed
                ? "0 0px 0 #d97706"
                : "0 3px 0 #d97706, 0 4px 8px -2px rgba(217,119,6,0.2)",
            }}
          >
            {cta}
          </button>
        </div>

        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 15,
            delay: 0.5,
          }}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}

export function DashboardContent({ user }: { user: User }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const fullName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const [transitioning, setTransitioning] = useState(false);
  const [pressed, setPressed] = useState<string | null>(null);

  const greetingKey = useMemo(() => getGreetingKey(), []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setTransitioning(true);
  }

  const handleTransitionComplete = useCallback(() => {
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate={transitioning ? "hidden" : "show"}
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff] font-[family-name:var(--font-sans)]"
    >
      {/* Header - compact, no big purple block */}
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
              background:
                "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              boxShadow:
                "0 3px 0 #5b21b6, 0 6px 12px -4px rgba(124,58,237,0.4)",
            }}
          >
            {initials || "C"}
          </motion.div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-extrabold leading-tight text-[#1e1b4b] truncate">
              {t(greetingKey, { name: fullName })}
            </h1>
            <p className="text-[11px] font-semibold text-[#1e1b4b]/40">
              {t("sessionsToday", { count: 0 })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats strip */}
      <motion.div
        variants={fadeUp}
        className="mx-5 mt-3 grid grid-cols-4 gap-2"
      >
        <StatCard
          value={0}
          label={t("statStudents")}
          color="#7c3aed"
          delay={0.15}
        />
        <StatCard
          value={0}
          label={t("statGroups")}
          color="#22c55e"
          delay={0.2}
        />
        <StatCard
          value={0}
          label={t("statSessions")}
          color="#f97316"
          delay={0.25}
        />
        <StatCard
          value={0}
          label={t("statPending")}
          color="#ef4444"
          delay={0.3}
        />
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 scrollbar-hide">
        {/* Quick actions - 2 columns top, 1 full width */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <ActionCard
            id="group"
            gradient="linear-gradient(150deg, #a78bfa 0%, #7c3aed 60%, #6d28d9 100%)"
            shadow3d="#5b21b6"
            shadowGlow="rgba(124,58,237,0.4)"
            icon={
              <motion.svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="white"
                stroke="none"
              >
                <motion.rect
                  x="10"
                  y="3"
                  width="4"
                  height="18"
                  rx="2"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 20,
                    delay: 0.4,
                  }}
                  style={{ originY: 0.5 }}
                />
                <motion.rect
                  x="3"
                  y="10"
                  width="18"
                  height="4"
                  rx="2"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 20,
                    delay: 0.5,
                  }}
                  style={{ originX: 0.5 }}
                />
              </motion.svg>
            }
            label={t("createGroup")}
            description={t("createGroupDesc")}
            pressed={pressed === "group"}
            onPress={() => setPressed("group")}
            onRelease={() => setPressed(null)}
          />

          <ActionCard
            id="appel"
            gradient="linear-gradient(150deg, #86efac 0%, #22c55e 60%, #16a34a 100%)"
            shadow3d="#15803d"
            shadowGlow="rgba(34,197,94,0.4)"
            icon={
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="white"
                stroke="none"
              >
                <path d="M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-7 18v-1c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
                <motion.circle
                  cx="19"
                  cy="4"
                  r="3"
                  fill="#4ade80"
                  stroke="white"
                  strokeWidth="2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 12,
                    delay: 0.6,
                  }}
                />
              </svg>
            }
            label={t("takeAttendance")}
            description={t("takeAttendanceDesc")}
            pressed={pressed === "appel"}
            onPress={() => setPressed("appel")}
            onRelease={() => setPressed(null)}
          />
        </motion.div>

        {/* Payments full width */}
        <motion.div variants={fadeUp} className="mt-3">
          <ActionCard
            id="pay"
            gradient="linear-gradient(150deg, #fdba74 0%, #f97316 60%, #ea580c 100%)"
            shadow3d="#c2410c"
            shadowGlow="rgba(249,115,22,0.4)"
            icon={
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="white"
                stroke="none"
              >
                <path d="M4 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4H4V4z" />
                <path
                  d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8z"
                  opacity="0.7"
                />
                <motion.rect
                  x="8"
                  y="13"
                  width="8"
                  height="3"
                  rx="1"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 20,
                    delay: 0.55,
                  }}
                  style={{ originX: 0.5 }}
                />
              </svg>
            }
            label={t("managePayments")}
            description={t("managePaymentsDesc")}
            pressed={pressed === "pay"}
            onPress={() => setPressed("pay")}
            onRelease={() => setPressed(null)}
            className="w-full"
          />
        </motion.div>

        {/* Quiz card */}
        <motion.div variants={fadeUp} className="mt-4">
          <QuizCard
            pressed={pressed === "quiz"}
            onPress={() => setPressed("quiz")}
            onRelease={() => setPressed(null)}
            label={t("createQuiz")}
            description={t("createQuizDesc")}
            cta={t("quizCta")}
          />
        </motion.div>

        {/* Logout */}
        <motion.div variants={fadeUp} className="mt-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl bg-white py-3 text-[14px] font-extrabold text-[#ef4444] transition-[transform,box-shadow] duration-[80ms] active:translate-y-[3px]"
            style={{
              boxShadow:
                "0 4px 0 #fecaca, 0 8px 20px -6px rgba(239,68,68,0.12)",
            }}
          >
            {t("logoutCta")}
          </button>
        </motion.div>

        <div className="h-28" />
      </div>

      <BottomNav active="home" />

      <PageTransition
        active={transitioning}
        onComplete={handleTransitionComplete}
        color="#ef4444"
      />
    </motion.main>
  );
}
