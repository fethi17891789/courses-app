"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { PageTransition } from "@/components/auth/page-transition";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import type { User } from "@supabase/supabase-js";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] as const },
  },
};

export function DashboardContent({ user }: { user: User }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const fullName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const [transitioning, setTransitioning] = useState(false);
  const [pressed, setPressed] = useState<string | null>(null);

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
      {/* Header */}
      <motion.div
        variants={fadeUp}
        className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] px-5 pb-8 pt-10"
      >
        <div
          className="absolute -top-12 h-40 w-40 rounded-full opacity-30"
          style={{
            right: "-3rem",
            background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)",
          }}
        />
        <div className="relative z-10">
          <p className="text-[13px] font-semibold text-white/70">
            {t("title")}
          </p>
          <h1 className="mt-1 text-[22px] font-extrabold text-white">
            {t("welcome", { name: fullName })}
          </h1>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2 scrollbar-hide">
        {/* 3 vertical action cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
          {/* Creer un groupe */}
          <button
            onPointerDown={() => setPressed("group")}
            onPointerUp={() => setPressed(null)}
            onPointerLeave={() => setPressed(null)}
            className="relative flex flex-col items-center gap-3 overflow-hidden rounded-xl pb-5 pt-6 transition-all duration-[80ms] ease-out"
            style={{
              background: "linear-gradient(150deg, #a78bfa 0%, #7c3aed 60%, #6d28d9 100%)",
              transform: `translateY(${pressed === "group" ? 5 : 0}px)`,
              boxShadow: pressed === "group"
                ? "0 0px 0 #5b21b6, 0 2px 4px -2px rgba(124,58,237,0.4)"
                : "0 5px 0 #5b21b6, 0 10px 24px -6px rgba(124,58,237,0.4)",
            }}
          >
            <div
              className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.7), transparent 70%)" }}
            />
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none" className="relative">
              <rect x="10" y="3" width="4" height="18" rx="2" />
              <rect x="3" y="10" width="18" height="4" rx="2" />
            </svg>
            <span className="relative text-[11px] font-bold text-white/90">
              Creer groupe
            </span>
          </button>

          {/* Faire l'appel */}
          <button
            onPointerDown={() => setPressed("appel")}
            onPointerUp={() => setPressed(null)}
            onPointerLeave={() => setPressed(null)}
            className="relative flex flex-col items-center gap-3 overflow-hidden rounded-xl pb-5 pt-6 transition-all duration-[80ms] ease-out"
            style={{
              background: "linear-gradient(150deg, #86efac 0%, #22c55e 60%, #16a34a 100%)",
              transform: `translateY(${pressed === "appel" ? 5 : 0}px)`,
              boxShadow: pressed === "appel"
                ? "0 0px 0 #15803d, 0 2px 4px -2px rgba(34,197,94,0.4)"
                : "0 5px 0 #15803d, 0 10px 24px -6px rgba(34,197,94,0.4)",
            }}
          >
            <div
              className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.7), transparent 70%)" }}
            />
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none" className="relative">
              <path d="M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-7 18v-1c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
              <circle cx="19" cy="4" r="3" fill="#4ade80" stroke="white" strokeWidth="2" />
            </svg>
            <span className="relative text-[11px] font-bold text-white/90">
              Faire l'appel
            </span>
          </button>

          {/* Troisieme bouton */}
          <button
            onPointerDown={() => setPressed("pay")}
            onPointerUp={() => setPressed(null)}
            onPointerLeave={() => setPressed(null)}
            className="relative flex flex-col items-center gap-3 overflow-hidden rounded-xl pb-5 pt-6 transition-all duration-[80ms] ease-out"
            style={{
              background: "linear-gradient(150deg, #fdba74 0%, #f97316 60%, #ea580c 100%)",
              transform: `translateY(${pressed === "pay" ? 5 : 0}px)`,
              boxShadow: pressed === "pay"
                ? "0 0px 0 #c2410c, 0 2px 4px -2px rgba(249,115,22,0.4)"
                : "0 5px 0 #c2410c, 0 10px 24px -6px rgba(249,115,22,0.4)",
            }}
          >
            <div
              className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.7), transparent 70%)" }}
            />
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none" className="relative">
              <path d="M4 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4H4V4z" />
              <path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8z" opacity="0.7" />
              <rect x="8" y="13" width="8" height="3" rx="1" />
            </svg>
            <span className="relative text-[11px] font-bold text-white/90">
              Paiements
            </span>
          </button>
        </motion.div>

        {/* Big quiz-style card */}
        <motion.div variants={fadeUp} className="mt-5">
          <div
            className="relative w-full overflow-hidden rounded-xl p-5"
            style={{
              background: "linear-gradient(150deg, #fde68a 0%, #fbbf24 60%, #f59e0b 100%)",
              boxShadow: "0 5px 0 #b45309, 0 10px 24px -6px rgba(251,191,36,0.4)",
            }}
          >
            <div
              className="absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.7), transparent 70%)" }}
            />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-[18px] font-extrabold text-white">
                  Creer un Quiz
                </h3>
                <p className="mt-1 text-[11px] font-semibold text-white/60">
                  Testez vos eleves avec un quiz interactif
                </p>
                <button
                  onPointerDown={() => setPressed("quiz")}
                  onPointerUp={() => setPressed(null)}
                  onPointerLeave={() => setPressed(null)}
                  className="mt-3 inline-flex items-center rounded-xl bg-white px-4 py-2 text-[11px] font-bold transition-all duration-[80ms]"
                  style={{
                    color: "#b45309",
                    transform: `translateY(${pressed === "quiz" ? 3 : 0}px)`,
                    boxShadow: pressed === "quiz"
                      ? "0 0px 0 #ddd6fe"
                      : "0 3px 0 #ddd6fe",
                  }}
                >
                  Commencer
                </button>
              </div>

              <div className="ml-3 flex items-center justify-center">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="11" fill="white" opacity="0.25" />
                  <text x="12" y="17" textAnchor="middle" fontSize="16" fontWeight="900" fill="white" fontFamily="Plus Jakarta Sans, sans-serif">?</text>
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-5">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl bg-white py-3 text-[14px] font-extrabold text-[#ef4444] transition-all duration-[80ms] active:translate-y-[3px]"
            style={{
              boxShadow: "0 5px 0 #ddd6fe, 0 10px 24px -6px rgba(30,27,75,0.1)",
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
