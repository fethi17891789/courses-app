"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type ReferralData = {
  code: string;
  count: number;
  next_available_at: string | null;
  can_refer: boolean;
};

function CopyRow({
  label,
  code,
  color,
  bg,
  copiedLabel,
  copyLabel,
}: {
  label: string;
  code: string;
  color: string;
  bg: string;
  copiedLabel: string;
  copyLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: bg }}>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#1e1b4b]/30">
          {label}
        </p>
        <p className="font-mono text-[18px] font-black tracking-[0.15em]" style={{ color }}>
          {code}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="btn-push rounded-xl px-2.5 py-2 text-[11px] font-bold"
        style={{
          background: copied
            ? "linear-gradient(135deg, #22c55e, #16a34a)"
            : "linear-gradient(135deg, #f5f3ff, #ede9fe)",
          color: copied ? "#fff" : "#7c3aed",
          "--push-shadow": copied ? "#15803d" : "#e9e5f5",
          "--push-glow": copied ? "rgba(34,197,94,0.3)" : "rgba(124,58,237,0.1)",
          "--push-depth": "2px",
        } as React.CSSProperties}
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}

export function ReferralCard({
  roleKind,
}: {
  roleKind?: "prof" | "director" | "school_teacher";
}) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const [data, setData] = useState<ReferralData | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [schoolLinkCopied, setSchoolLinkCopied] = useState(false);

  const isDirector = roleKind === "director";

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.code) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;
  if (!data.can_refer && !isDirector) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = `${origin}/${locale}/login?ref=${data.code}`;
  const schoolCode = `ECO-${data.code}`;
  const schoolLink = `${origin}/${locale}/login?ref=${schoolCode}`;

  function handleShareLink() {
    const shareText = t("referralShareHint");
    if (navigator.share) {
      navigator.share({ text: shareText, url: referralLink }).catch(() => {});
    } else {
      navigator.clipboard.writeText(referralLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  function handleShareSchoolLink() {
    const shareText = t("schoolInviteShareHint");
    if (navigator.share) {
      navigator.share({ text: shareText, url: schoolLink }).catch(() => {});
    } else {
      navigator.clipboard.writeText(schoolLink);
      setSchoolLinkCopied(true);
      setTimeout(() => setSchoolLinkCopied(false), 2000);
    }
  }

  return (
    <div className="mt-5">
      {/* Section ecole (directeur only) */}
      {isDirector && (
        <>
          <p className="mb-2 text-[12px] font-bold uppercase text-[#1e1b4b]/30">
            {t("schoolInviteSection")}
          </p>
          <div
            className="rounded-2xl bg-white p-4"
            style={{ boxShadow: "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                  boxShadow: "0 3px 0 #5b21b6, 0 6px 12px -2px rgba(124,58,237,0.3)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold text-[#1e1b4b]">
                  {t("schoolInviteTitle")}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[#1e1b4b]/40">
                  {t("schoolInviteDesc")}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <CopyRow
                label={t("schoolInviteCode")}
                code={schoolCode}
                color="#7c3aed"
                bg="rgba(124,58,237,0.05)"
                copiedLabel={t("copied")}
                copyLabel={t("copy")}
              />
            </div>

            <button
              onClick={handleShareSchoolLink}
              className="btn-push mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-extrabold text-white"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                "--push-shadow": "#5b21b6",
                "--push-glow": "rgba(124,58,237,0.4)",
              } as React.CSSProperties}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              {schoolLinkCopied ? t("copied") : t("schoolInviteShareLink")}
            </button>
          </div>
        </>
      )}

      {/* Section parrainage classique (seulement si autorise) */}
      {data.can_refer && (
        <>
          <p className={`mb-2 text-[12px] font-bold uppercase text-[#1e1b4b]/30 ${isDirector ? "mt-5" : ""}`}>
            {t("referral")}
          </p>
          <div
            className="rounded-2xl bg-white p-4"
            style={{ boxShadow: "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #fb923c, #ea580c)",
                  boxShadow: "0 3px 0 #c2410c, 0 6px 12px -2px rgba(249,115,22,0.3)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold text-[#1e1b4b]">
                  {t("referralTitle")}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[#1e1b4b]/40">
                  {t("referralDesc")}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <CopyRow
                label={t("referralYourCode")}
                code={data.code}
                color="#7c3aed"
                bg="rgba(124,58,237,0.05)"
                copiedLabel={t("copied")}
                copyLabel={t("copy")}
              />
            </div>

            <button
              onClick={handleShareLink}
              className="btn-push mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-extrabold text-white"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                "--push-shadow": "#5b21b6",
                "--push-glow": "rgba(124,58,237,0.4)",
              } as React.CSSProperties}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              {linkCopied ? t("copied") : t("referralShareLink")}
            </button>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[#1e1b4b]/40">
                {t("referralCount", { count: data.count })}
              </p>
              {data.next_available_at ? (
                <p className="text-[11px] font-bold text-[#f97316]">
                  {t("referralCooldown", {
                    date: new Date(data.next_available_at).toLocaleDateString(
                      locale === "ar" ? "ar-DZ" : "fr-FR",
                      { day: "numeric", month: "long" }
                    ),
                  })}
                </p>
              ) : (
                <p className="text-[11px] font-bold text-[#22c55e]">
                  {t("referralReady")}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
