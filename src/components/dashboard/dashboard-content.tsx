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
      <motion.div
        variants={fadeUp}
        className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] px-5 pb-8 pt-10"
      >
        <div className="absolute -top-12 h-40 w-40 rounded-full opacity-30" style={{ right: "-3rem", background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)" }} />
        <div className="relative z-10">
          <p className="text-[13px] font-semibold text-white/70">
            {t("title")}
          </p>
          <h1 className="mt-1 text-[22px] font-extrabold text-white">
            {t("welcome", { name: fullName })}
          </h1>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex-1 px-5 pt-6">
        <div className="rounded-[28px] bg-white p-6 shadow-[0_16px_48px_-12px_rgba(30,27,75,0.1)]">
          <p className="text-center text-[14px] font-semibold text-[#1e1b4b]/60">
            {user.user_metadata?.role === "prof"
              ? "Espace professeur"
              : user.user_metadata?.role === "eleve"
                ? "Espace eleve"
                : "Espace parent"}
          </p>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="p-5">
        <button
          onClick={handleLogout}
          className="w-full rounded-xl border-2 border-red-200 bg-red-50 py-3 text-[14px] font-extrabold text-red-500 shadow-[0_3px_0_#fecaca] transition-all duration-[80ms] active:translate-y-[2px] active:shadow-[0_1px_0_#fecaca]"
        >
          {t("logoutCta")}
        </button>
      </motion.div>

      <div className="h-24" />

      <BottomNav active="home" />

      <PageTransition
        active={transitioning}
        onComplete={handleTransitionComplete}
        color="#ef4444"
      />
    </motion.main>
  );
}
