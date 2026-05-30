"use client";

import { useState, useRef, useId, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { NextIntlClientProvider, useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import frMessages from "@/i18n/messages/fr.json";
import arMessages from "@/i18n/messages/ar.json";

type Mode = "login" | "signup";
type Role = "prof" | "eleve" | "parent";
type Locale = "fr" | "ar";

const allRoles: Role[] = ["prof", "eleve", "parent"];
const allMessages = { fr: frMessages, ar: arMessages };

type Theme = {
  primary: string;
  gradientFrom: string;
  gradientTo: string;
  shadow3d: string;
  shadowGlow: string;
  bgTint: string;
  inputBorder: string;
  inputBg: string;
  focusRing: string;
};

const themes: Record<Role, Theme> = {
  prof: {
    primary: "#7c3aed",
    gradientFrom: "#8b5cf6",
    gradientTo: "#6d28d9",
    shadow3d: "#5b21b6",
    shadowGlow: "rgba(124,58,237,0.5)",
    bgTint: "#f5f3ff",
    inputBorder: "#ddd6fe",
    inputBg: "#f9f7ff",
    focusRing: "rgba(124,58,237,0.12)",
  },
  eleve: {
    primary: "#22c55e",
    gradientFrom: "#4ade80",
    gradientTo: "#16a34a",
    shadow3d: "#15803d",
    shadowGlow: "rgba(34,197,94,0.5)",
    bgTint: "#f0fdf4",
    inputBorder: "#bbf7d0",
    inputBg: "#f7fef9",
    focusRing: "rgba(34,197,94,0.12)",
  },
  parent: {
    primary: "#f97316",
    gradientFrom: "#fb923c",
    gradientTo: "#ea580c",
    shadow3d: "#c2410c",
    shadowGlow: "rgba(249,115,22,0.5)",
    bgTint: "#fff7ed",
    inputBorder: "#fed7aa",
    inputBg: "#fffaf5",
    focusRing: "rgba(249,115,22,0.12)",
  },
};

const roleDisplay: Record<Role, { shadow: string }> = {
  prof: { shadow: "#5b21b6" },
  eleve: { shadow: "#15803d" },
  parent: { shadow: "#9a3412" },
};

function GradientLayers({ activeRole, rtl = false }: { activeRole: Role; rtl?: boolean }) {
  const angle = rtl ? "225deg" : "135deg";
  return (
    <>
      {allRoles.map((r) => (
        <div
          key={r}
          className="absolute inset-0 rounded-[inherit] transition-opacity duration-300 ease-in-out"
          style={{
            background: `linear-gradient(${angle}, ${themes[r].gradientFrom}, ${themes[r].gradientTo})`,
            opacity: activeRole === r ? 1 : 0,
          }}
        />
      ))}
    </>
  );
}

function FlipText({ children, locale }: { children: string; locale: string }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={`${locale}-${children}`}
        className="inline-block"
        initial={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
        transition={{ duration: reduced ? 0.1 : 0.2, ease: "easeOut" as const }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

const fieldIcons: Record<string, (color: string, filled: boolean) => React.ReactNode> = {
  email: (c, f) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={f ? c : "none"} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke={f ? "#fff" : c} />
    </svg>
  ),
  password: (c, f) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={f ? c : "none"} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="3" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={c} fill="none" />
      <circle cx="12" cy="16.5" r="1.5" fill={f ? "#fff" : c} stroke="none" />
    </svg>
  ),
  text: (c, f) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" fill={f ? c : "none"} />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  ),
  tel: (c, f) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={f ? c : "none"} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  key: (c, f) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={f ? c : "none"} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
};

const layoutTransition = { type: "spring" as const, stiffness: 200, damping: 28 };

function Field({
  label,
  type = "text",
  iconType,
  theme,
  locale,
  value,
  onValueChange,
}: {
  label: string;
  type?: string;
  iconType?: string;
  theme: Theme;
  locale: string;
  value: string;
  onValueChange: (v: string) => void;
}) {
  const fieldId = useId();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const filled = value.length > 0;
  const floated = focused || filled;
  const iconKey = iconType || type;
  const iconFn = fieldIcons[iconKey] || fieldIcons.text;
  const iconColor = focused ? theme.primary : "#1e1b4b30";
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div
      className="relative overflow-hidden rounded-xl border-2 duration-200 ease-out [transition-property:border-color,background-color,box-shadow,transform]"
      style={{
        borderColor: focused ? theme.primary : theme.inputBorder,
        backgroundColor: focused ? "#ffffff" : theme.inputBg,
        boxShadow: focused
          ? `0 0 0 4px ${theme.focusRing}, 0 3px 0 ${theme.shadow3d}40`
          : `0 3px 0 ${theme.inputBorder}`,
        transform: `translateY(${focused ? -1 : 0}px)`,
      }}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-[2px] origin-center transition-transform duration-300 ease-out"
        style={{
          background: `linear-gradient(90deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
          transform: `scaleX(${focused ? 1 : 0})`,
        }}
      />

      <motion.div
        layout="position"
        transition={layoutTransition}
        className="pointer-events-none absolute top-1/2 -translate-y-1/2"
        style={{ insetInlineStart: "0.5rem" }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 ease-out"
          style={{
            backgroundColor: focused ? `${theme.primary}18` : "transparent",
            transform: `scale(${focused ? 1.1 : 1})`,
          }}
        >
          {iconFn(iconColor, focused)}
        </div>
      </motion.div>

      <motion.input
        id={fieldId}
        type={inputType}
        aria-label={label}
        value={value}
        key={isPassword ? `pw-${showPassword}` : undefined}
        initial={isPassword ? { opacity: 0, filter: "blur(4px)" } : false}
        animate={isPassword ? { opacity: 1, filter: "blur(0px)" } : undefined}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="peer h-11 w-full rounded-xl bg-transparent text-[13px] font-semibold text-[#1e1b4b] outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
        style={{
          paddingInlineStart: "2.5rem",
          paddingInlineEnd: isPassword ? "2.75rem" : "0.875rem",
          paddingTop: floated ? "0.75rem" : "0",
          // @ts-expect-error -- focus-visible ring color
          "--tw-ring-color": theme.primary,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onValueChange(e.currentTarget.value)}
      />

      {isPassword && (
        <motion.button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((v) => !v)}
          whileTap={{ scale: 0.8 }}
          className="absolute top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200"
          style={{
            insetInlineEnd: "0.375rem",
            backgroundColor: focused ? `${theme.primary}12` : "transparent",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.svg
              key={showPassword ? "visible" : "hidden"}
              initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 30 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={focused ? theme.primary : "#1e1b4b50"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {showPassword ? (
                <>
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" fill={focused ? `${theme.primary}30` : "#1e1b4b15"} />
                </>
              ) : (
                <>
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.5 0 8.4 3.2 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12c1.6 3.8 5.5 7 10 7a10.44 10.44 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </>
              )}
            </motion.svg>
          </AnimatePresence>
        </motion.button>
      )}

      <motion.label
        layout="position"
        transition={layoutTransition}
        htmlFor={fieldId}
        className="pointer-events-none absolute font-bold transition-all duration-200 ease-out"
        style={{
          insetInlineStart: "2.5rem",
          top: floated ? "0.15rem" : "50%",
          transform: floated ? "translateY(0)" : "translateY(-50%)",
          fontSize: floated ? "9px" : "13px",
          color: focused ? theme.primary : "#1e1b4b80",
          letterSpacing: floated ? "0.05em" : "0",
        }}
      >
        <FlipText locale={locale}>{label}</FlipText>
      </motion.label>
    </div>
  );
}

function PushButton({
  children,
  theme,
  pressed,
  disabled,
  onPressStart,
  onPressEnd,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  theme: Theme;
  pressed: boolean;
  disabled?: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      disabled={disabled}
      className={`relative overflow-hidden rounded-xl text-[14px] font-extrabold text-white transition-all duration-[80ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70 ${className}`}
      style={{
        transform: `translateY(${pressed && !disabled ? 5 : 0}px)`,
        boxShadow: pressed && !disabled
          ? `0 0px 0 ${theme.shadow3d}, 0 2px 4px -2px ${theme.shadowGlow}`
          : `0 5px 0 ${theme.shadow3d}, 0 10px 24px -6px ${theme.shadowGlow}`,
      }}
      onPointerDown={disabled ? undefined : onPressStart}
      onPointerUp={disabled ? undefined : onPressEnd}
      onPointerLeave={disabled ? undefined : onPressEnd}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
}

export function LoginScreen() {
  const initialLocale = useLocale() as Locale;
  const [activeLocale, setActiveLocale] = useState<Locale>(initialLocale);

  const switchLocale = useCallback(() => {
    const next = activeLocale === "fr" ? "ar" : "fr";
    setActiveLocale(next);
    window.history.replaceState(null, "", `/${next}/login`);
  }, [activeLocale]);

  return (
    <NextIntlClientProvider locale={activeLocale} messages={allMessages[activeLocale]}>
      <LoginScreenInner
        activeLocale={activeLocale}
        switchLocale={switchLocale}
      />
    </NextIntlClientProvider>
  );
}

function LoginScreenInner({
  activeLocale,
  switchLocale,
}: {
  activeLocale: Locale;
  switchLocale: () => void;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("prof");
  const [submitPressed, setSubmitPressed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const changeSource = useRef<"mode" | "locale">("mode");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [activationKey, setActivationKey] = useState("");

  const theme = themes[role];
  const isRtl = activeLocale === "ar";
  const dir = isRtl ? "rtl" : "ltr";
  const fontClass = isRtl
    ? "font-[family-name:var(--font-arabic)]"
    : "font-[family-name:var(--font-sans)]";

  function handleSwitchLocale() {
    changeSource.current = "locale";
    switchLocale();
  }

  function switchMode(m: Mode) {
    changeSource.current = "mode";
    setMode(m);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError(t("errorEmail"));
      return;
    }
    if (password.length < 6) {
      setError(t("errorPassword"));
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (authError) {
          setError(t("errorInvalidCredentials"));
          return;
        }

        router.push(`/${activeLocale}/dashboard`);
        router.refresh();
      } else {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            password,
            fullName: fullName.trim(),
            phone: phone.trim(),
            role,
            activationKey: role === "prof" ? activationKey.trim() : undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const errorMap: Record<string, string> = {
            email_taken: t("errorEmailTaken"),
            invalid_key: t("errorInvalidKey"),
            key_already_used: t("errorKeyUsed"),
            missing_key: t("errorMissingKey"),
          };
          setError(errorMap[data.error] || t("errorGeneric"));
          return;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (loginError) {
          setSuccess(t("signupSuccess"));
          return;
        }

        router.push(`/${activeLocale}/dashboard`);
        router.refresh();
      }
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  const textAnim = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } as const }
    : changeSource.current === "locale"
      ? {
          initial: { opacity: 0, x: isRtl ? -12 : 12 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: isRtl ? 12 : -12 },
          transition: { duration: 0.2, ease: "easeOut" as const },
        }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -8 },
          transition: { duration: 0.18, ease: "easeOut" as const },
        };

  return (
    <main
      dir={dir}
      className={`flex h-[100dvh] flex-col overflow-y-auto transition-colors duration-300 ease-in-out ${fontClass}`}
      style={{ backgroundColor: theme.bgTint }}
    >
      {/* header */}
      <div className="relative shrink-0 overflow-hidden rounded-b-[32px] px-5 pb-12 pt-10">
        <GradientLayers activeRole={role} rtl={isRtl} />

        <motion.div
          layout="position"
          transition={layoutTransition}
          className="absolute -top-12 h-40 w-40 rounded-full opacity-30"
          style={{
            insetInlineEnd: "-3rem",
            background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <motion.div
            layout="position"
            transition={layoutTransition}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg font-black text-white"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }}
          >
            C
          </motion.div>
          <div className="flex-1">
            <h1 className="text-[22px] font-extrabold leading-tight text-white">
              Courses
            </h1>
            <p className="text-[13px] font-semibold text-white/70">
              <FlipText locale={activeLocale}>{t("tagline")}</FlipText>
            </p>
          </div>
          <motion.button
            layout="position"
            transition={layoutTransition}
            onClick={handleSwitchLocale}
            className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-[12px] font-extrabold text-white transition-all duration-[80ms] active:translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            style={{
              boxShadow: "0 2px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            {activeLocale === "fr" ? "AR" : "FR"}
          </motion.button>
        </div>
      </div>

      {/* form card */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.15 }}
        className="-mt-6 relative z-10 mx-5 rounded-[28px] bg-white px-5 pb-5 pt-4 shadow-[0_16px_48px_-12px_rgba(30,27,75,0.15)]"
      >
        <div className="relative mb-3 h-6 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={`${mode}-${activeLocale}`}
              className="text-[18px] font-extrabold text-[#1e1b4b]"
              {...textAnim}
            >
              {mode === "login" ? t("welcomeBack") : t("getStarted")}
            </motion.h2>
          </AnimatePresence>
        </div>

        {/* toggle */}
        <div
          className="relative mb-3 grid grid-cols-2 rounded-xl p-1 text-[13px] font-bold transition-colors duration-300"
          style={{ backgroundColor: `${theme.primary}12` }}
        >
          {(["login", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="relative z-10 rounded-lg py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{ color: mode === m ? "#ffffff" : theme.primary }}
            >
              <FlipText locale={activeLocale}>{t(m)}</FlipText>
            </button>
          ))}
          <div
            className="absolute inset-y-1 w-[calc(50%-0.25rem)] overflow-hidden rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              insetInlineStart: mode === "login" ? "0.25rem" : "calc(50%)",
              boxShadow: `0 3px 0 ${theme.shadow3d}, 0 6px 12px -2px ${theme.shadowGlow}`,
            }}
          >
            <GradientLayers activeRole={role} rtl={isRtl} />
          </div>
        </div>

        {/* fields */}
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {mode === "signup" && (
              <motion.div
                key="signup-fields"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2.5 pb-2.5">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-bold text-[#1e1b4b]/60">
                      <FlipText locale={activeLocale}>{t("iAmA")}</FlipText>
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {allRoles.map((r) => {
                        const rt = themes[r];
                        const active = role === r;
                        return (
                          <button
                            key={r}
                            onClick={() => setRole(r)}
                            className="rounded-xl border-2 py-2.5 text-xs font-extrabold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                            style={{
                              borderColor: active ? rt.primary : "#ede9fe",
                              background: active ? `${rt.primary}14` : "#faf8ff",
                              color: active ? rt.primary : "#1e1b4b50",
                              boxShadow: active
                                ? `0 4px 0 ${roleDisplay[r].shadow}, 0 6px 12px -4px ${rt.shadowGlow}`
                                : "0 3px 0 #e5e1f5",
                            }}
                            onPointerDown={(e) => {
                              e.currentTarget.style.transform = "translateY(4px)";
                              e.currentTarget.style.boxShadow = "0 0px 0 transparent";
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
                            <FlipText locale={activeLocale}>{t(`role_${r}`)}</FlipText>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Field
                    label={t("fullName")}
                    theme={theme}
                    locale={activeLocale}
                    value={fullName}
                    onValueChange={setFullName}
                  />

                  <Field
                    label={t("phone")}
                    type="tel"
                    theme={theme}
                    locale={activeLocale}
                    value={phone}
                    onValueChange={setPhone}
                  />

                  <AnimatePresence initial={false}>
                    {role === "prof" && (
                      <motion.div
                        key="activation-key"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <Field
                          label={t("activationKey")}
                          type="text"
                          iconType="key"
                          theme={theme}
                          locale={activeLocale}
                          value={activationKey}
                          onValueChange={setActivationKey}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Field
            label={t("email")}
            type="email"
            theme={theme}
            locale={activeLocale}
            value={email}
            onValueChange={setEmail}
          />

          <Field
            label={t("password")}
            type="password"
            theme={theme}
            locale={activeLocale}
            value={password}
            onValueChange={setPassword}
          />
        </div>

        {/* error / success messages */}
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
          {success && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-[12px] font-semibold text-green-600"
            >
              {success}
            </motion.p>
          )}
        </AnimatePresence>

        {/* submit */}
        <PushButton
          theme={theme}
          pressed={submitPressed}
          disabled={loading}
          onPressStart={() => setSubmitPressed(true)}
          onPressEnd={() => setSubmitPressed(false)}
          onClick={handleSubmit}
          className="mt-4 w-full py-3"
        >
          <GradientLayers activeRole={role} rtl={isRtl} />
          <span className="relative z-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={loading ? "loading" : `${mode}-${activeLocale}`}
                className="inline-block"
                {...textAnim}
              >
                {loading
                  ? t("loading")
                  : mode === "login"
                    ? t("loginCta")
                    : t("signupCta")}
              </motion.span>
            </AnimatePresence>
          </span>
        </PushButton>

      </motion.div>
    </main>
  );
}
