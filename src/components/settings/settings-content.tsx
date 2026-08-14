"use client";

import { useState, useCallback, useEffect } from "react";
import type { AuthUser } from "@/lib/auth-user";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { PageTransition } from "@/components/auth/page-transition";
import { ReferralCard } from "@/components/settings/referral-card";
import { FeedbackCard } from "@/components/settings/feedback-card";

type PremiumStatus =
  | {
      premium: true;
      plan: string;
      max_students: number | null;
      key?: string;
      expires_at: string | null;
      activated_at?: string | null;
      // Contexte ecole (renvoye par /api/auth/premium)
      role_kind?: "prof" | "director" | "school_teacher";
      seat_limit?: number | null;
      school_name?: string;
      skip?: boolean;
    }
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

export function SettingsContent({ user, role = "prof", owner = false }: { user: AuthUser; role?: string; owner?: boolean }) {
  const isProf = role === "prof";
  const theme =
    role === "eleve"
      ? {
          bg: "#f0fdf4",
          cardShadow: "0 3px 0 #bbf7d0, 0 6px 16px -4px rgba(34,197,94,0.08)",
          avatarBg: "linear-gradient(135deg, #4ade80, #16a34a)",
          avatarShadow: "0 3px 0 #15803d",
          langBg: "rgba(34,197,94,0.07)",
          langText: "#22c55e",
          sliderBg: "linear-gradient(135deg, #4ade80, #16a34a)",
          sliderShadow: "0 3px 0 #15803d, 0 6px 12px -2px rgba(34,197,94,0.5)",
        }
      : role === "parent"
        ? {
            bg: "#fff7ed",
            cardShadow: "0 3px 0 #fed7aa, 0 6px 16px -4px rgba(249,115,22,0.08)",
            avatarBg: "linear-gradient(135deg, #fb923c, #ea580c)",
            avatarShadow: "0 3px 0 #c2410c",
            langBg: "rgba(249,115,22,0.07)",
            langText: "#f97316",
            sliderBg: "linear-gradient(135deg, #fb923c, #ea580c)",
            sliderShadow: "0 3px 0 #c2410c, 0 6px 12px -2px rgba(249,115,22,0.5)",
          }
        : {
            bg: "#f0ecff",
            cardShadow: "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)",
            avatarBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
            avatarShadow: "0 3px 0 #5b21b6",
            langBg: "rgba(124,58,237,0.07)",
            langText: "#7c3aed",
            sliderBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
            sliderShadow: "0 3px 0 #5b21b6, 0 6px 12px -2px rgba(124,58,237,0.5)",
          };
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
  const [adminPressed, setAdminPressed] = useState(false);
  const [deletePressed, setDeletePressed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pendingLocale = useState<string | null>(null);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);

  useEffect(() => {
    if (!isProf) return;
    fetch("/api/auth/premium")
      .then((r) => r.json())
      .then((data) => setPremiumStatus(data))
      .catch(() => {});
  }, [isProf]);

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

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", { method: "DELETE" });
      if (!res.ok) {
        alert(t("deleteAccountError"));
        setDeleting(false);
        return;
      }
      setShowDeleteModal(false);
      const supabase = createClient();
      await supabase.auth.signOut();
      setTransitioning(true);
    } catch {
      setDeleting(false);
      alert(t("deleteAccountError"));
    }
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
      className="flex min-h-[100dvh] flex-col"
      style={{ backgroundColor: theme.bg }}
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
          style={{ boxShadow: theme.cardShadow }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[15px] font-black text-white"
            style={{
              background: theme.avatarBg,
              boxShadow: theme.avatarShadow,
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

        {/* Subscription card (prof only) */}
        {isProf && premiumStatus?.premium && (() => {
          const roleKind = premiumStatus.role_kind;
          const isDirector = roleKind === "director";
          const isSchoolTeacher = roleKind === "school_teacher";
          const isSchool = isDirector || isSchoolTeacher;
          // Offre payante / illimitee -> carte "premium" foncee.
          const isPro = !isSchool && premiumStatus.plan === "pro";
          const dark = isPro || isSchool;
          const badgeText = isSchool ? "E" : isPro ? "PRO" : "S";
          const planTitle = isDirector
            ? premiumStatus.plan === "school_pro"
              ? t("planSchoolPro")
              : t("planSchoolStarter")
            : isSchoolTeacher
              ? t("planSchoolTeacher")
              : isPro
                ? t("planPro")
                : t("planStarter");
          const planDesc = isDirector
            ? t("planSchoolDirectorDesc", { seats: premiumStatus.seat_limit ?? 0 })
            : isSchoolTeacher
              ? t("planSchoolTeacherDesc", { school: premiumStatus.school_name ?? "" })
              : isPro
                ? t("planProDesc")
                : t("planStarterDesc");
          return (
            <motion.div variants={fadeUp} className="mt-5">
              <p className="mb-2 text-[12px] font-bold uppercase text-[#1e1b4b]/30">
                {t("subscription")}
              </p>
              <div
                className="relative overflow-hidden rounded-2xl p-4"
                style={{
                  background: dark
                    ? "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)"
                    : "#ffffff",
                  boxShadow: dark
                    ? "0 4px 0 #0f0e2a, 0 8px 24px -4px rgba(30,27,75,0.3)"
                    : "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)",
                }}
              >
                {dark && (
                  <>
                    <div
                      className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-15"
                      style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }}
                    />
                    <div
                      className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full opacity-10"
                      style={{ background: "radial-gradient(circle, #f59e0b, transparent 70%)" }}
                    />
                  </>
                )}
                <div className="relative flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-black tracking-tight text-white"
                    style={{
                      background: isPro
                        ? "linear-gradient(135deg, #f59e0b, #d97706)"
                        : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                      boxShadow: isPro
                        ? "0 3px 0 #92400e, 0 6px 12px -2px rgba(245,158,11,0.4)"
                        : "0 3px 0 #5b21b6, 0 6px 12px -2px rgba(124,58,237,0.3)",
                    }}
                  >
                    {badgeText}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className="text-[15px] font-extrabold"
                        style={{ color: dark ? "#ffffff" : "#1e1b4b" }}
                      >
                        {planTitle}
                      </p>
                      {isPro && (
                        <span
                          className="rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                          style={{
                            background: "linear-gradient(135deg, #f59e0b, #d97706)",
                            color: "#1e1b4b",
                          }}
                        >
                          VIP
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-0.5 text-[11px] font-semibold"
                      style={{ color: dark ? "rgba(255,255,255,0.5)" : "rgba(30,27,75,0.4)" }}
                    >
                      {planDesc}
                    </p>
                  </div>
                </div>
                <div
                  className="relative mt-3 rounded-lg px-3 py-2"
                  style={{
                    background: dark ? "rgba(255,255,255,0.08)" : "rgba(124,58,237,0.05)",
                  }}
                >
                  <p
                    className="text-[11px] font-semibold"
                    style={{ color: dark ? "rgba(255,255,255,0.6)" : "rgba(30,27,75,0.4)" }}
                  >
                    {premiumStatus.expires_at
                      ? t("expiresAt", {
                          date: new Date(premiumStatus.expires_at).toLocaleDateString(
                            locale === "ar" ? "ar-DZ" : "fr-FR",
                            { day: "numeric", month: "long", year: "numeric" }
                          ),
                        })
                      : t("premiumActive")}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Referral (prof only, pas les salaries d'ecole) */}
        {isProf && !(premiumStatus?.premium && premiumStatus.role_kind === "school_teacher") && (
          <ReferralCard roleKind={premiumStatus?.premium ? premiumStatus.role_kind : undefined} />
        )}

        {/* Language toggle */}
        <motion.div variants={fadeUp} className="mt-5">
          <p className="mb-2 text-[12px] font-bold uppercase text-[#1e1b4b]/30">
            {t("language")}
          </p>
          <div
            className="relative grid grid-cols-2 rounded-xl p-1 text-[13px] font-extrabold"
            style={{ backgroundColor: theme.langBg }}
          >
            {[
              { id: "fr", label: t("french") },
              { id: "ar", label: t("arabic") },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => handleSwitchLocale(lang.id)}
                className="relative z-10 rounded-lg py-2.5 transition-colors duration-200"
                style={{ color: locale === lang.id ? "#ffffff" : theme.langText }}
              >
                {lang.label}
              </button>
            ))}
            <div
              className="absolute inset-y-1 w-[calc(50%-0.25rem)] z-0 overflow-hidden rounded-lg transition-[inset-inline-start,box-shadow] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{
                insetInlineStart: locale === "fr" ? "0.25rem" : "calc(50%)",
                background: theme.sliderBg,
                boxShadow: theme.sliderShadow,
              }}
            />
          </div>
        </motion.div>

        {/* Feedback: bug report / feature idea */}
        <motion.div variants={fadeUp}>
          <FeedbackCard role={role} />
        </motion.div>

        {/* Poste de pilotage (proprietaire uniquement) */}
        {owner && (
          <motion.div variants={fadeUp} className="mt-5">
            <button
              onClick={() => router.push(`/${locale}/admin`)}
              onPointerDown={() => setAdminPressed(true)}
              onPointerUp={() => setAdminPressed(false)}
              onPointerLeave={() => setAdminPressed(false)}
              className="flex w-full items-center gap-3 rounded-xl py-3.5 pl-4 pr-3 text-left text-[14px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms]"
              style={{
                background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
                transform: `translateY(${adminPressed ? 3 : 0}px)`,
                boxShadow: adminPressed
                  ? "0 0px 0 #0f0e2a"
                  : "0 3px 0 #0f0e2a, 0 6px 16px -4px rgba(30,27,75,0.3)",
              }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z" fill="#fbbf24" />
                </svg>
              </span>
              <span className="flex-1">Poste de pilotage</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-50">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </motion.div>
        )}

        {/* Legal link */}
        <motion.div variants={fadeUp} className="mt-5">
          <button
            onClick={() => router.push(`/${locale}/legal`)}
            className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3.5 text-[14px] font-extrabold text-[#1e1b4b]"
            style={{ boxShadow: theme.cardShadow }}
          >
            <span>{t("legal")}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-30">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
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

        {/* Delete account */}
        <motion.div variants={fadeUp} className="mt-3">
          <button
            onClick={() => setShowDeleteModal(true)}
            onPointerDown={() => setDeletePressed(true)}
            onPointerUp={() => setDeletePressed(false)}
            onPointerLeave={() => setDeletePressed(false)}
            className="w-full rounded-xl py-3 text-[12px] font-bold text-[#1e1b4b]/30 transition-[transform] duration-[80ms]"
            style={{ transform: `translateY(${deletePressed ? 1 : 0}px)` }}
          >
            {t("deleteAccount")}
          </button>
        </motion.div>

        <div className="h-28" />

        {/* Delete account modal */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ backgroundColor: "rgba(30,27,75,0.4)" }}
            onClick={() => !deleting && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, ease }}
              className="w-full max-w-sm rounded-3xl bg-white p-6"
              style={{ boxShadow: "0 -4px 32px rgba(30,27,75,0.15)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 flex justify-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    boxShadow: "0 3px 0 #991b1b",
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <h3 className="mt-3 text-center text-[16px] font-extrabold text-[#1e1b4b]">
                {t("deleteAccountTitle")}
              </h3>
              <p className="mt-2 text-center text-[13px] font-semibold text-[#1e1b4b]/50">
                {t("deleteAccountWarning")}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="w-full rounded-xl py-3.5 text-[14px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms] disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    boxShadow: "0 3px 0 #991b1b, 0 6px 12px -2px rgba(239,68,68,0.3)",
                  }}
                >
                  {deleting ? "..." : t("deleteAccountConfirm")}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="w-full rounded-xl bg-[#f0ecff] py-3.5 text-[14px] font-extrabold text-[#1e1b4b] disabled:opacity-60"
                >
                  {t("deleteAccountCancel")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>


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
