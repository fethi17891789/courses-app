"use client";

import { useState, useMemo, useEffect } from "react";
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
  const [stats, setStats] = useState({ groups: 0, sessionsToday: 0 });

  const greetingKey = useMemo(() => getGreetingKey(), []);

  useEffect(() => {
    fetch("/api/student/me")
      .then((r) => r.json())
      .then((data) => {
        const groups = data.groups?.length || 0;
        const today = new Date().getDay();
        const schedule = data.schedule || {};
        const sessionsToday = (schedule[today] || []).length;
        setStats({ groups, sessionsToday });
      })
      .catch(() => {});
  }, []);

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0fdf4]"
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

      {/* Stats strip */}
      <motion.div
        variants={fadeUp}
        className="mx-5 mt-3 grid grid-cols-2 gap-2"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
          className="flex flex-col items-center gap-1 rounded-xl bg-white px-2 py-3"
          style={{ boxShadow: "0 3px 0 rgba(34,197,94,0.15), 0 6px 16px -4px rgba(34,197,94,0.08)" }}
        >
          <span className="text-[20px] font-extrabold leading-none text-[#22c55e]">{stats.groups}</span>
          <span className="text-[10px] font-bold text-[#1e1b4b]/50">{tDash("statGroups")}</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
          className="flex flex-col items-center gap-1 rounded-xl bg-white px-2 py-3"
          style={{ boxShadow: "0 3px 0 rgba(249,115,22,0.15), 0 6px 16px -4px rgba(249,115,22,0.08)" }}
        >
          <span className="text-[20px] font-extrabold leading-none text-[#f97316]">{stats.sessionsToday}</span>
          <span className="text-[10px] font-bold text-[#1e1b4b]/50">{tDash("statSessions")}</span>
        </motion.div>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 scrollbar-hide">
        {/* Quick actions - 2 columns: purple left (rejoindre), green right (paiements) */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
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
          />

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
          />
        </motion.div>

        {/* Announcements full width (purple) */}
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
                  <path d="M3 9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1V9H3z" fill="white" />
                  <path d="M5.5 8.8l11-4.6A1 1 0 0 1 18 5.1v13.8a1 1 0 0 1-1.5.9l-11-4.6V8.8z" fill="white" />
                  <path d="M7 16.3V19a2 2 0 0 0 4 0v-1.1L7 16.3z" fill="white" />
                </motion.g>
              </svg>
            }
            label={t("announcements")}
            description={t("announcementsDesc")}
            pressed={pressed === "announcements"}
            onPress={() => setPressed("announcements")}
            onRelease={() => setPressed(null)}
            onClick={() => router.push(`/${locale}/announcements`)}
            className="w-full"
          />
        </motion.div>

        {/* Subjects (PDF) full width (red) */}
        <motion.div variants={fadeUp} className="mt-3">
          <ActionCard
            gradient="linear-gradient(150deg, #fca5a5 0%, #ef4444 60%, #dc2626 100%)"
            shadow3d="#b91c1c"
            shadowGlow="rgba(239,68,68,0.4)"
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
                    d="M6 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9l-7-7H6zm7 1.5V8a1 1 0 0 0 1 1h4.5L13 3.5zM8 13a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1zm1 3a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H9z"
                    fill="white"
                  />
                </motion.g>
              </svg>
            }
            label={t("subjects")}
            description={t("subjectsDesc")}
            pressed={pressed === "subjects"}
            onPress={() => setPressed("subjects")}
            onRelease={() => setPressed(null)}
            onClick={() => router.push(`/${locale}/subjects`)}
            className="w-full"
          />
        </motion.div>

        {/* Schedule full width (orange) */}
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

        {/* Quiz card */}
        <motion.div variants={fadeUp} className="mt-4">
          <div
            className="relative w-full overflow-hidden rounded-xl p-5"
            style={{
              background: "linear-gradient(150deg, #fde68a 0%, #fbbf24 60%, #f59e0b 100%)",
              boxShadow: "0 4px 0 #b45309, 0 8px 20px -6px rgba(251,191,36,0.4)",
            }}
          >
            <div
              className="absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.7), transparent 70%)" }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex-1">
                <h3 className="text-[16px] font-extrabold text-white">{t("quiz")}</h3>
                <p className="mt-1 text-[11px] font-semibold text-white/60">{t("quizDesc")}</p>
                <button
                  onPointerDown={() => setPressed("quiz")}
                  onPointerUp={() => setPressed(null)}
                  onPointerLeave={() => setPressed(null)}
                  onClick={() => router.push(`/${locale}/quiz/play`)}
                  className="mt-3 inline-flex items-center rounded-xl bg-white px-4 py-2 text-[12px] font-extrabold transition-[transform,box-shadow] duration-[80ms]"
                  style={{
                    color: "#b45309",
                    transform: `translateY(${pressed === "quiz" ? 3 : 0}px)`,
                    boxShadow: pressed === "quiz"
                      ? "0 0px 0 #d97706"
                      : "0 3px 0 #d97706, 0 4px 8px -2px rgba(217,119,6,0.2)",
                  }}
                >
                  {t("quizCta")}
                </button>
              </div>
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.5 }}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <motion.g
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 16, delay: 0.4 }}
                  >
                    <rect x="1" y="11" width="7" height="11" rx="2" fill="white" opacity="0.7" />
                    <rect x="8.5" y="4" width="7" height="18" rx="2" fill="white" />
                    <rect x="16" y="14" width="7" height="8" rx="2" fill="white" opacity="0.5" />
                    <path d="M12 7l1 2.2 2.4.2-1.8 1.6.5 2.4L12 12.2 9.9 13.4l.5-2.4-1.8-1.6 2.4-.2L12 7z" fill="rgba(251,191,36,0.7)" />
                  </motion.g>
                </svg>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="h-28" />
      </div>

      <BottomNav active="home" role="eleve" />
    </motion.main>
  );
}
