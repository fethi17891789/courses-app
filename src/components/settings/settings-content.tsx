"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { PageTransition } from "@/components/auth/page-transition";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import type { User } from "@supabase/supabase-js";

type PremiumStatus =
  | { premium: true; key: string; expires_at: string | null; activated_at: string | null }
  | { premium: false; reason: string };

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

export function SettingsContent({ user, role = "prof" }: { user: User; role?: string }) {
  const isStudent = role === "eleve";
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
  const locale = useLocale();
  const [transitioning, setTransitioning] = useState(false);
  const [langTransitioning, setLangTransitioning] = useState(false);
  const [logoutPressed, setLogoutPressed] = useState(false);
  const pendingLocale = useState<string | null>(null);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);

  useEffect(() => {
    if (isStudent) return;
    fetch("/api/auth/premium")
      .then((r) => r.json())
      .then((data) => setPremiumStatus(data))
      .catch(() => {});
  }, [isStudent]);

  function handleSwitchLocale(newLocale: string) {
    if (newLocale === locale) return;
    document.cookie = `preferred-locale=${newLocale};path=/;max-age=31536000;SameSite=Lax;Secure`;
    pendingLocale[1](newLocale);
    setLangTransitioning(true);
  }

  const handleLangTransitionComplete = useCallback(() => {
    const newLocale = pendingLocale[0];
    if (!newLocale) return;
    const currentPath = window.location.pathname;
    const newPath = currentPath.replace(/^\/(fr|ar)/, `/${newLocale}`);
    window.location.href = newPath;
  }, [pendingLocale]);

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
      className={`flex min-h-[100dvh] flex-col ${isStudent ? "bg-[#f0fdf4]" : "bg-[#f0ecff]"}`}
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
            boxShadow: isStudent
              ? "0 3px 0 #bbf7d0, 0 6px 16px -4px rgba(34,197,94,0.08)"
              : "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)",
          }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[15px] font-black text-white"
            style={{
              background: isStudent
                ? "linear-gradient(135deg, #4ade80, #16a34a)"
                : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              boxShadow: isStudent ? "0 3px 0 #15803d" : "0 3px 0 #5b21b6",
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

        {/* Premium status (prof only) */}
        {!isStudent && premiumStatus?.premium && (
          <motion.div variants={fadeUp} className="mt-5">
            <p className="mb-2 text-[12px] font-bold uppercase text-[#1e1b4b]/30">
              {t("subscription")}
            </p>
            <div
              className="rounded-xl bg-white p-4"
              style={{
                boxShadow: "0 3px 0 #bbf7d0, 0 6px 16px -4px rgba(34,197,94,0.08)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[14px] font-black text-white"
                  style={{
                    background: "linear-gradient(135deg, #4ade80, #16a34a)",
                    boxShadow: "0 2px 0 #15803d",
                  }}
                >
                  P
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-extrabold text-[#1e1b4b]">
                    {t("premiumActive")}
                  </p>
                  <p className="text-[11px] font-semibold text-[#1e1b4b]/40">
                    {premiumStatus.expires_at
                      ? t("expiresAt", {
                          date: new Date(premiumStatus.expires_at).toLocaleDateString(
                            locale === "ar" ? "ar-DZ" : "fr-FR",
                            { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }
                          ),
                        })
                      : t("premiumActive")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Language toggle */}
        <motion.div variants={fadeUp} className="mt-5">
          <p className="mb-2 text-[12px] font-bold uppercase text-[#1e1b4b]/30">
            {t("language")}
          </p>
          <div
            className="relative grid grid-cols-2 rounded-xl p-1 text-[13px] font-extrabold"
            style={{ backgroundColor: isStudent ? "rgba(34,197,94,0.07)" : "rgba(124,58,237,0.07)" }}
          >
            {[
              { id: "fr", label: t("french") },
              { id: "ar", label: t("arabic") },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => handleSwitchLocale(lang.id)}
                className="relative z-10 rounded-lg py-2.5 transition-colors duration-200"
                style={{ color: locale === lang.id ? "#ffffff" : isStudent ? "#22c55e" : "#7c3aed" }}
              >
                {lang.label}
              </button>
            ))}
            <div
              className="absolute inset-y-1 w-[calc(50%-0.25rem)] z-0 overflow-hidden rounded-lg transition-[inset-inline-start,left,box-shadow] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{
                left: locale === "fr" ? "0.25rem" : "calc(50%)",
                background: isStudent
                  ? "linear-gradient(135deg, #4ade80, #16a34a)"
                  : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                boxShadow: isStudent
                  ? "0 3px 0 #15803d, 0 6px 12px -2px rgba(34,197,94,0.5)"
                  : "0 3px 0 #5b21b6, 0 6px 12px -2px rgba(124,58,237,0.5)",
              }}
            />
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

      <BottomNav active="settings" role={role} />

      <PageTransition
        active={transitioning}
        onComplete={handleTransitionComplete}
        color="#ef4444"
      />
      <PageTransition
        active={langTransitioning}
        onComplete={handleLangTransitionComplete}
        color="#7c3aed"
      />
    </motion.main>
  );
}
