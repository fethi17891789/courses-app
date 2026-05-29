"use client";

import { useState, useRef, useId } from "react";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "framer-motion";
import { NextIntlClientProvider, useLocale, useTranslations } from "next-intl";
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
  const prevRole = useRef(activeRole);
  const roles = activeRole === prevRole.current
    ? [activeRole]
    : [prevRole.current, activeRole];
  if (activeRole !== prevRole.current) prevRole.current = activeRole;

  return (
    <>
      {roles.map((r) => (
        <motion.div
          key={r}
          className="absolute inset-0 rounded-[inherit]"
          style={{
            background: `linear-gradient(${angle}, ${themes[r].gradientFrom}, ${themes[r].gradientTo})`,
          }}
          animate={{ opacity: activeRole === r ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function FlipText({ children, locale }: { children: string; locale: string }) {
  const reduced = useReducedMotion();
  return (
    <span style={{ perspective: "600px" }} className="inline-flex">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`${locale}-${children}`}
          initial={reduced ? { opacity: 0 } : { rotateY: 90, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { rotateY: 0, opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { rotateY: -90, opacity: 0 }}
          transition={{ duration: reduced ? 0.15 : 0.3, ease: "easeInOut" }}
          style={{ display: "inline-block" }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const fieldIcons: Record<string, (color: string, filled: boolean) => React.ReactNode> = {
  email: (c, f) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={f ? c : "none"} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "all 0.3s" }}>
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke={f ? "#fff" : c} />
    </svg>
  ),
  password: (c, f) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={f ? c : "none"} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "all 0.3s" }}>
      <rect x="3" y="11" width="18" height="11" rx="3" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={c} fill="none" />
      <circle cx="12" cy="16.5" r="1.5" fill={f ? "#fff" : c} stroke="none" />
    </svg>
  ),
  text: (c, f) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "all 0.3s" }}>
      <circle cx="12" cy="8" r="5" fill={f ? c : "none"} />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  ),
  tel: (c, f) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={f ? c : "none"} stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "all 0.3s" }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
};

function Field({
  label,
  type = "text",
  theme,
  locale,
}: {
  label: string;
  type?: string;
  theme: Theme;
  locale: string;
}) {
  const fieldId = useId();
  const [focused, setFocused] = useState(false);
  const [filled, setFilled] = useState(false);
  const floated = focused || filled;
  const iconFn = fieldIcons[type] || fieldIcons.text;
  const iconColor = focused ? theme.primary : "#1e1b4b30";

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl border-2"
      animate={{
        borderColor: focused ? theme.primary : theme.inputBorder,
        backgroundColor: focused ? "#ffffff" : theme.inputBg,
        boxShadow: focused
          ? `0 0 0 4px ${theme.focusRing}, 0 3px 0 ${theme.shadow3d}40`
          : `0 3px 0 ${theme.inputBorder}`,
        y: focused ? -1 : 0,
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileTap={{ y: 1, boxShadow: `0 1px 0 ${theme.inputBorder}` }}
    >
      {/* animated accent line at bottom */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${theme.gradientFrom}, ${theme.gradientTo})` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      {/* icon container with bg pill */}
      <div
        className="pointer-events-none absolute top-1/2 -translate-y-1/2"
        style={{ insetInlineStart: "0.5rem" }}
      >
        <motion.div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          animate={{
            backgroundColor: focused ? `${theme.primary}18` : "transparent",
            scale: focused ? 1.1 : 1,
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {iconFn(iconColor, focused)}
        </motion.div>
      </div>

      <input
        id={fieldId}
        type={type}
        aria-label={label}
        className="peer h-11 w-full rounded-xl bg-transparent text-[13px] font-semibold text-[#1e1b4b] outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
        style={{
          paddingInlineStart: "2.5rem",
          paddingInlineEnd: "0.875rem",
          paddingTop: floated ? "0.75rem" : "0",
          // @ts-expect-error -- focus-visible ring color
          "--tw-ring-color": theme.primary,
        }}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          setFilled(e.currentTarget.value.length > 0);
        }}
        onChange={(e) => setFilled(e.currentTarget.value.length > 0)}
      />

      {/* floating label */}
      <motion.label
        htmlFor={fieldId}
        className="pointer-events-none absolute font-bold"
        style={{ insetInlineStart: "2.5rem" }}
        animate={{
          top: floated ? "0.15rem" : "50%",
          y: floated ? 0 : "-50%",
          fontSize: floated ? "9px" : "13px",
          color: focused ? theme.primary : "#1e1b4b80",
          letterSpacing: floated ? "0.05em" : "0",
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <FlipText locale={locale}>{label}</FlipText>
      </motion.label>
    </motion.div>
  );
}

export function LoginScreen() {
  const initialLocale = useLocale() as Locale;
  const [activeLocale, setActiveLocale] = useState<Locale>(initialLocale);

  function switchLocale() {
    const next = activeLocale === "fr" ? "ar" : "fr";
    setActiveLocale(next);
    window.history.replaceState(null, "", `/${next}/login`);
  }

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
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("prof");
  const changeSource = useRef<"mode" | "locale">("mode");
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
  }

  return (
    <LayoutGroup>
      <motion.main
        dir={dir}
        className={`flex h-[100dvh] flex-col overflow-y-auto ${fontClass}`}
        animate={{ backgroundColor: theme.bgTint }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* header */}
        <div className="relative shrink-0 overflow-hidden rounded-b-[32px] px-5 pb-12 pt-10">
          <GradientLayers activeRole={role} rtl={isRtl} />

          <motion.div
            layout
            className="absolute -top-12 h-40 w-40 rounded-full opacity-30"
            style={{
              insetInlineEnd: "-3rem",
              background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)",
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />

          <div className="relative z-10 flex items-center gap-3">
            <motion.div
              layout
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg font-black text-white"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              C
            </motion.div>
            <motion.div layout className="flex-1" transition={{ duration: 0.4, ease: "easeInOut" }}>
              <h1 className="text-[22px] font-extrabold leading-tight text-white">
                Courses
              </h1>
              <p className="text-[13px] font-semibold text-white/70">
                <FlipText locale={activeLocale}>{t("tagline")}</FlipText>
              </p>
            </motion.div>
            <motion.button
              layout
              onClick={handleSwitchLocale}
              className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-[12px] font-extrabold text-white transition-all duration-[80ms] active:translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              style={{
                boxShadow: "0 2px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)",
              }}
              onPointerDown={(e) => {
                e.currentTarget.style.boxShadow = "0 0px 0 transparent, inset 0 1px 0 rgba(255,255,255,0.3)";
              }}
              onPointerUp={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)";
              }}
              onPointerLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 0 rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)";
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              {activeLocale === "fr" ? "AR" : "FR"}
            </motion.button>
          </div>
        </div>

        {/* form card */}
        <motion.div
          layout
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: "spring", stiffness: 120, damping: 18, delay: 0.15,
            layout: { duration: 0.4, ease: "easeInOut" },
          }}
          className="-mt-6 relative z-10 mx-5 rounded-[28px] bg-white px-5 pb-5 pt-4 shadow-[0_16px_48px_-12px_rgba(30,27,75,0.15)]"
        >
          <div className="relative mb-3 h-6 overflow-hidden" style={{ perspective: "600px" }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={`${mode}-${activeLocale}`}
                className="text-[18px] font-extrabold text-[#1e1b4b]"
                initial={
                  reduced ? { opacity: 0 }
                  : changeSource.current === "locale"
                    ? { rotateY: 90, opacity: 0 }
                    : { opacity: 0, y: 10, filter: "blur(4px)" }
                }
                animate={
                  reduced ? { opacity: 1 }
                  : changeSource.current === "locale"
                    ? { rotateY: 0, opacity: 1 }
                    : { opacity: 1, y: 0, filter: "blur(0px)" }
                }
                exit={
                  reduced ? { opacity: 0 }
                  : changeSource.current === "locale"
                    ? { rotateY: -90, opacity: 0 }
                    : { opacity: 0, y: -10, filter: "blur(4px)" }
                }
                transition={
                  reduced ? { duration: 0.15 }
                  : changeSource.current === "locale"
                    ? { duration: 0.3, ease: "easeInOut" }
                    : { duration: 0.2, ease: "easeOut" }
                }
              >
                {mode === "login" ? t("welcomeBack") : t("getStarted")}
              </motion.h2>
            </AnimatePresence>
          </div>

          {/* toggle */}
          <motion.div
            layout
            className="relative mb-3 grid grid-cols-2 rounded-xl p-1 text-[13px] font-bold"
            animate={{ backgroundColor: `${theme.primary}12` }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {(["login", "signup"] as Mode[]).map((m) => (
              <motion.button
                key={m}
                onClick={() => switchMode(m)}
                className="relative z-10 rounded-lg py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                animate={{ color: mode === m ? "#ffffff" : theme.primary }}
                transition={{ duration: 0.3 }}
              >
                <FlipText locale={activeLocale}>{t(m)}</FlipText>
              </motion.button>
            ))}
            <motion.div
              layout
              className="absolute inset-y-1 w-[calc(50%-0.25rem)] overflow-hidden rounded-lg"
              style={{ insetInlineStart: mode === "login" ? "0.25rem" : "calc(50%)" }}
              animate={{
                boxShadow: `0 3px 0 ${theme.shadow3d}, 0 6px 12px -2px ${theme.shadowGlow}`,
              }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            >
              <GradientLayers activeRole={role} rtl={isRtl} />
            </motion.div>
          </motion.div>

          {/* fields */}
          <div className="flex flex-col gap-2.5">
            <AnimatePresence initial={false}>
              {mode === "signup" && (
                <motion.div
                  key="signup-fields"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
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
                            <motion.button
                              key={r}
                              onClick={() => setRole(r)}
                              className="rounded-xl border-2 py-2.5 text-xs font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                              animate={{
                                borderColor: active ? rt.primary : "#ede9fe",
                                background: active ? `${rt.primary}14` : "#faf8ff",
                                color: active ? rt.primary : "#1e1b4b50",
                                boxShadow: active
                                  ? `0 3px 0 ${roleDisplay[r].shadow}`
                                  : "0 2px 0 #e5e1f5",
                              }}
                              whileTap={{
                                y: 3,
                                boxShadow: "0 0px 0 transparent",
                                transition: { duration: 0.08 },
                              }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                            >
                              <FlipText locale={activeLocale}>{t(`role_${r}`)}</FlipText>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <Field
                      label={t("fullName")}
                      theme={theme}
                      locale={activeLocale}
                    />

                    <Field
                      label={t("phone")}
                      type="tel"
                      theme={theme}
                      locale={activeLocale}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Field
              label={t("email")}
              type="email"
              theme={theme}
              locale={activeLocale}
            />

            <Field
              label={t("password")}
              type="password"
              theme={theme}
              locale={activeLocale}
            />
          </div>

          {/* submit */}
          <motion.button
            layout="position"
            whileTap={{
              y: 5,
              boxShadow: `0 0px 0 ${theme.shadow3d}, 0 2px 4px -2px ${theme.shadowGlow}`,
              transition: { duration: 0.08 },
            }}
            className="relative mt-4 w-full overflow-hidden rounded-xl py-3 text-[14px] font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            animate={{
              boxShadow: `0 5px 0 ${theme.shadow3d}, 0 10px 24px -6px ${theme.shadowGlow}`,
            }}
            transition={{ duration: 0.3, ease: "easeInOut", layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
          >
            <GradientLayers activeRole={role} rtl={isRtl} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${mode}-${activeLocale}`}
                className="relative z-10"
                initial={
                  reduced ? { opacity: 0 }
                  : changeSource.current === "locale"
                    ? { rotateY: 90, opacity: 0 }
                    : { opacity: 0, y: 8, filter: "blur(4px)" }
                }
                animate={
                  reduced ? { opacity: 1 }
                  : changeSource.current === "locale"
                    ? { rotateY: 0, opacity: 1 }
                    : { opacity: 1, y: 0, filter: "blur(0px)" }
                }
                exit={
                  reduced ? { opacity: 0 }
                  : changeSource.current === "locale"
                    ? { rotateY: -90, opacity: 0 }
                    : { opacity: 0, y: -8, filter: "blur(4px)" }
                }
                transition={
                  reduced ? { duration: 0.15 }
                  : changeSource.current === "locale"
                    ? { duration: 0.3, ease: "easeInOut" }
                    : { duration: 0.2, ease: "easeOut" }
                }
                style={{ display: "inline-block", perspective: "600px" }}
              >
                {mode === "login" ? t("loginCta") : t("signupCta")}
              </motion.span>
            </AnimatePresence>
          </motion.button>

        </motion.div>
      </motion.main>
    </LayoutGroup>
  );
}
