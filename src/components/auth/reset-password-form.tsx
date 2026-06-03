"use client";

import { useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

function getPasswordScore(pw: string) {
  const hasMinLength = pw.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  return {
    hasMinLength,
    hasLetter,
    hasNumber,
    score: [hasMinLength, hasLetter, hasNumber].filter(Boolean).length,
  };
}

function PasswordField({
  label,
  value,
  onValueChange,
  focused,
  onFocus,
  onBlur,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const fieldId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const filled = value.length > 0;
  const floated = focused || filled;

  return (
    <div
      className="relative overflow-hidden rounded-xl border-2 duration-200 ease-out [transition-property:border-color,background-color,box-shadow,transform]"
      style={{
        borderColor: focused ? "#7c3aed" : "#ddd6fe",
        backgroundColor: focused ? "#ffffff" : "#f9f7ff",
        boxShadow: focused
          ? "0 0 0 4px rgba(124,58,237,0.12), 0 3px 0 rgba(91,33,182,0.25)"
          : "0 3px 0 #ddd6fe",
        transform: `translateY(${focused ? -1 : 0}px)`,
      }}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-[2px] origin-center transition-transform duration-300 ease-out"
        style={{
          background: "linear-gradient(90deg, #8b5cf6, #6d28d9)",
          transform: `scaleX(${focused ? 1 : 0})`,
        }}
      />

      <div
        className="pointer-events-none absolute top-1/2 -translate-y-1/2"
        style={{ insetInlineStart: "0.5rem" }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 ease-out"
          style={{
            backgroundColor: focused ? "rgba(124,58,237,0.09)" : "transparent",
            transform: `scale(${focused ? 1.1 : 1})`,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={focused ? "#7c3aed" : "none"}
            stroke={focused ? "#7c3aed" : "#1e1b4b30"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="3" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={focused ? "#7c3aed" : "#1e1b4b30"} fill="none" />
            <circle cx="12" cy="16.5" r="1.5" fill={focused ? "#fff" : "#1e1b4b30"} stroke="none" />
          </svg>
        </div>
      </div>

      <input
        id={fieldId}
        type={showPassword ? "text" : "password"}
        aria-label={label}
        value={value}
        className="peer h-11 w-full rounded-xl bg-transparent text-[13px] font-semibold text-[#1e1b4b] outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
        style={{
          paddingInlineStart: "2.5rem",
          paddingInlineEnd: "2.75rem",
          paddingTop: floated ? "0.75rem" : "0",
          // @ts-expect-error -- focus-visible ring color
          "--tw-ring-color": "#7c3aed",
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onValueChange(e.currentTarget.value)}
      />

      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShowPassword((v) => !v)}
        className="absolute top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200"
        style={{
          insetInlineEnd: "0.375rem",
          backgroundColor: focused ? "rgba(124,58,237,0.07)" : "transparent",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={focused ? "#7c3aed" : "#1e1b4b50"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {showPassword ? (
            <>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" fill={focused ? "rgba(124,58,237,0.19)" : "#1e1b4b15"} />
            </>
          ) : (
            <>
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.5 0 8.4 3.2 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12c1.6 3.8 5.5 7 10 7a10.44 10.44 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </>
          )}
        </svg>
      </button>

      <label
        htmlFor={fieldId}
        className="pointer-events-none absolute font-bold transition-all duration-200 ease-out"
        style={{
          insetInlineStart: "2.5rem",
          top: floated ? "0.15rem" : "50%",
          transform: floated ? "translateY(0)" : "translateY(-50%)",
          fontSize: floated ? "9px" : "13px",
          color: focused ? "#7c3aed" : "#1e1b4b80",
          letterSpacing: floated ? "0.05em" : "0",
        }}
      >
        {label}
      </label>
    </div>
  );
}

function StrengthBar({ password }: { password: string }) {
  const t = useTranslations("auth");
  const { hasMinLength, hasLetter, hasNumber, score } = getPasswordScore(password);

  if (password.length === 0) return null;

  const levels = [
    { label: t("passwordWeak"), color: "#ef4444", width: "33%" },
    { label: t("passwordFair"), color: "#f97316", width: "66%" },
    { label: t("passwordGood"), color: "#22c55e", width: "100%" },
  ];
  const level = levels[Math.max(0, score - 1)];

  const criteria = [
    { met: hasMinLength, text: t("passwordMinLength") },
    { met: hasLetter, text: t("passwordHasLetter") },
    { met: hasNumber, text: t("passwordHasNumber") },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(124,58,237,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: level.width, backgroundColor: level.color }}
          />
        </div>
        <span className="text-[10px] font-bold shrink-0 transition-colors duration-200" style={{ color: level.color }}>
          {level.label}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {criteria.map(({ met, text }) => (
          <span
            key={text}
            className="text-[10px] font-semibold transition-colors duration-200 flex items-center gap-1"
            style={{ color: met ? "#22c55e" : "#1e1b4b40" }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {met
                ? <path d="M3 8.5 6.5 12 13 4" />
                : <><path d="M4 4 12 12" /><path d="M12 4 4 12" /></>}
            </svg>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale === "ar";
  const fontClass = isRtl
    ? "font-[family-name:var(--font-arabic)]"
    : "font-[family-name:var(--font-sans)]";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function handleReset() {
    setError(null);

    const { score } = getPasswordScore(password);
    if (score < 3) {
      setError(t("errorPasswordWeak"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("errorPasswordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(t("errorGeneric"));
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/dashboard`);
      }, 2000);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      className={`flex h-[100dvh] flex-col overflow-y-auto transition-colors duration-300 ease-in-out ${fontClass}`}
      style={{ backgroundColor: "#f5f3ff" }}
    >
      {/* header */}
      <div
        className="relative shrink-0 overflow-hidden rounded-b-[32px] px-5 pb-12 pt-10"
        style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
      >
        <div
          className="absolute -top-12 h-40 w-40 rounded-full opacity-30"
          style={{
            insetInlineEnd: "-3rem",
            background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg font-black text-white"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }}
          >
            C
          </div>
          <div className="flex-1">
            <h1 className="text-[22px] font-extrabold leading-tight text-white">
              Courses
            </h1>
            <p className="text-[13px] font-semibold text-white/70">
              {t("tagline")}
            </p>
          </div>
        </div>
      </div>

      {/* form card */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.15 }}
        className="-mt-6 relative z-10 mx-5 rounded-[28px] bg-white px-5 pb-5 pt-5 shadow-[0_16px_48px_-12px_rgba(30,27,75,0.15)]"
      >
        {!success ? (
          <>
            <h2 className="text-[18px] font-extrabold text-[#1e1b4b] mb-1">
              {t("resetTitle")}
            </h2>
            <p className="text-[12px] font-semibold text-[#1e1b4b]/60 mb-4">
              {t("resetSubtitle")}
            </p>

            <div className="flex flex-col gap-2.5">
              <PasswordField
                label={t("newPassword")}
                value={password}
                onValueChange={(v) => { setPassword(v); setError(null); }}
                focused={focusedField === "password"}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />

              <StrengthBar password={password} />

              <PasswordField
                label={t("confirmPassword")}
                value={confirmPassword}
                onValueChange={(v) => { setConfirmPassword(v); setError(null); }}
                focused={focusedField === "confirm"}
                onFocus={() => setFocusedField("confirm")}
                onBlur={() => setFocusedField(null)}
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              disabled={loading}
              onClick={handleReset}
              className="relative mt-4 w-full overflow-hidden rounded-xl py-3 text-[14px] font-extrabold text-white transition-all duration-[80ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                boxShadow: "0 5px 0 #5b21b6, 0 10px 24px -6px rgba(124,58,237,0.5)",
              }}
              onPointerDown={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(5px)";
                  e.currentTarget.style.boxShadow = "0 0px 0 #5b21b6, 0 2px 4px -2px rgba(124,58,237,0.5)";
                }
              }}
              onPointerUp={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
              }}
              onPointerLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              {loading ? t("loading") : t("resetCta")}
            </button>
          </>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="flex flex-col items-center py-6 gap-4"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #4ade80, #22c55e)",
                boxShadow: "0 5px 0 #15803d, 0 10px 24px -6px rgba(34,197,94,0.5)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12l5.5 5.5L20 6" />
              </svg>
            </div>
            <p className="text-[16px] font-extrabold text-[#1e1b4b] text-center">
              {t("resetSuccess")}
            </p>
            <p className="text-[12px] font-semibold text-[#1e1b4b]/50">
              {t("redirecting")}
            </p>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}
