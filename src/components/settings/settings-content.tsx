"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
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

export function SettingsContent({ user }: { user: User }) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const fullName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const email = user.email || "";
  const initials = fullName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const [transitioning, setTransitioning] = useState(false);
  const [logoutPressed, setLogoutPressed] = useState(false);

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
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff] font-[family-name:var(--font-sans)]"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="px-5 pb-1 pt-10">
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">
          {tCommon("settings")}
        </h1>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 scrollbar-hide">
        {/* Profile card */}
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-3 rounded-xl bg-white p-4"
          style={{
            boxShadow: "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)",
          }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[15px] font-black text-white"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              boxShadow: "0 3px 0 #5b21b6",
            }}
          >
            {initials || "C"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-extrabold text-[#1e1b4b]">
              {fullName}
            </p>
            <p className="truncate text-[12px] font-semibold text-[#1e1b4b]/40">
              {email}
            </p>
          </div>
        </motion.div>

        {/* Logout */}
        <motion.div variants={fadeUp} className="mt-5">
          <button
            onClick={handleLogout}
            onPointerDown={() => setLogoutPressed(true)}
            onPointerUp={() => setLogoutPressed(false)}
            onPointerLeave={() => setLogoutPressed(false)}
            className="w-full rounded-xl bg-white py-3.5 text-[14px] font-extrabold text-[#ef4444] transition-[transform,box-shadow] duration-[80ms]"
            style={{
              transform: `translateY(${logoutPressed ? 3 : 0}px)`,
              boxShadow: logoutPressed
                ? "0 0px 0 #fecaca, 0 1px 3px -1px rgba(239,68,68,0.1)"
                : "0 3px 0 #fecaca, 0 6px 16px -4px rgba(239,68,68,0.1)",
            }}
          >
            {t("logout")}
          </button>
        </motion.div>

        <div className="h-28" />
      </div>

      <BottomNav active="settings" />

      <PageTransition
        active={transitioning}
        onComplete={handleTransitionComplete}
        color="#ef4444"
      />
    </motion.main>
  );
}
