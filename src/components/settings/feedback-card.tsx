"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

type FeedbackType = "bug" | "idea";

const typeStyles: Record<
  FeedbackType,
  { color: string; bg: string; shadow: string; border: string }
> = {
  bug: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    shadow: "#fecaca",
    border: "#fecaca",
  },
  idea: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    shadow: "#fde68a",
    border: "#fde68a",
  },
};

export function FeedbackCard({ role = "prof" }: { role?: string }) {
  const t = useTranslations("settings");
  const [type, setType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accent =
    role === "eleve"
      ? { from: "#4ade80", to: "#16a34a", shadow: "#15803d", glow: "rgba(34,197,94,0.4)" }
      : role === "parent"
        ? { from: "#fb923c", to: "#ea580c", shadow: "#c2410c", glow: "rgba(249,115,22,0.4)" }
        : { from: "#8b5cf6", to: "#6d28d9", shadow: "#5b21b6", glow: "rgba(124,58,237,0.4)" };
  const cardShadow =
    role === "eleve"
      ? "0 3px 0 #bbf7d0, 0 6px 16px -4px rgba(34,197,94,0.08)"
      : role === "parent"
        ? "0 3px 0 #fed7aa, 0 6px 16px -4px rgba(249,115,22,0.08)"
        : "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)";

  function selectType(next: FeedbackType) {
    setSent(false);
    setError(null);
    setType((current) => (current === next ? null : next));
  }

  async function handleSend() {
    if (!type || sending) return;
    setError(null);
    if (message.trim().length < 10) {
      setError(t("feedbackTooShort"));
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message.trim() }),
      });
      if (!res.ok) {
        setError(res.status === 429 ? t("feedbackTooMany") : t("feedbackError"));
        return;
      }
      setMessage("");
      setType(null);
      setSent(true);
    } catch {
      setError(t("feedbackError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-5">
      <p className="mb-2 text-[12px] font-bold uppercase text-[#1e1b4b]/30">
        {t("feedback")}
      </p>
      <div
        className="rounded-2xl bg-white p-4"
        style={{ boxShadow: cardShadow }}
      >
        <p className="text-[11px] font-semibold leading-snug text-[#1e1b4b]/40">
          {t("feedbackDesc")}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["bug", "idea"] as FeedbackType[]).map((ft) => {
            const s = typeStyles[ft];
            const active = type === ft;
            return (
              <button
                key={ft}
                onClick={() => selectType(ft)}
                className="flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-[12px] font-extrabold transition-all duration-150 ease-out"
                style={{
                  borderColor: active ? s.color : "#ede9fe",
                  background: active ? s.bg : "#faf8ff",
                  color: active ? s.color : "#1e1b4b50",
                  boxShadow: active ? `0 3px 0 ${s.shadow}` : "0 3px 0 #e5e1f5",
                }}
              >
                {ft === "bug" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m8 2 1.88 1.88" />
                    <path d="M14.12 3.88 16 2" />
                    <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
                    <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
                    <path d="M12 20v-9" />
                    <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
                    <path d="M6 13H2" />
                    <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
                    <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
                    <path d="M22 13h-4" />
                    <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                  </svg>
                )}
                {ft === "bug" ? t("feedbackBug") : t("feedbackIdea")}
              </button>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {type && (
            <motion.div
              key="feedback-form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-3">
                <textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.currentTarget.value);
                    setError(null);
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={type === "bug" ? t("feedbackBugPlaceholder") : t("feedbackIdeaPlaceholder")}
                  rows={4}
                  maxLength={2000}
                  className="w-full resize-none rounded-xl border-2 px-3.5 py-3 text-[13px] font-semibold text-[#1e1b4b] outline-none transition-all duration-200 ease-out placeholder:text-[#1e1b4b]/30 scrollbar-hide"
                  style={{
                    borderColor: focused ? typeStyles[type].color : "#ede9fe",
                    backgroundColor: focused ? "#ffffff" : "#faf8ff",
                    boxShadow: focused
                      ? `0 0 0 4px ${typeStyles[type].bg}, 0 3px 0 ${typeStyles[type].border}`
                      : "0 3px 0 #e5e1f5",
                  }}
                />
                {error && (
                  <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                    {error}
                  </p>
                )}
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="btn-push mt-2 w-full rounded-xl py-2.5 text-[13px] font-extrabold text-white disabled:opacity-70"
                  style={{
                    background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                    "--push-shadow": accent.shadow,
                    "--push-glow": accent.glow,
                  } as React.CSSProperties}
                >
                  {sending ? t("feedbackSending") : t("feedbackSend")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sent && (
            <motion.p
              key="feedback-sent"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-3 rounded-lg bg-green-50 px-3 py-2.5 text-[12px] font-bold text-green-600"
            >
              {t("feedbackSuccess")}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
