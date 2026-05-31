"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLevelDef, levels, hasSections, categoryLabels, type LevelCategory } from "@/lib/levels";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

const paymentModeKeys: Record<string, string> = {
  monthly: "monthly",
  per_session: "perSession",
  weekly: "weekly",
};

type GroupInfo = {
  id: string;
  name: string;
  level: string;
  section: string | null;
  capacity: number;
  price: number;
  payment_mode: string;
  member_count: number;
  existing_request: { id: string; status: string } | null;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[12px] font-bold text-[#1e1b4b]/50">
      {children}
    </span>
  );
}

function InputField({
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      inputMode={type === "tel" ? "tel" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`h-11 w-full rounded-xl border-2 px-3 text-[13px] font-semibold outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#1e1b4b]/30 ${
        readOnly
          ? "border-[#e9e5f5] bg-[#f0ecff] text-[#1e1b4b]/60 cursor-not-allowed"
          : "border-[#ddd6fe] bg-[#f9f7ff] text-[#1e1b4b] focus:border-[#7c3aed] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
      }`}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full resize-none rounded-xl border-2 border-[#ddd6fe] bg-[#f9f7ff] px-3 py-2.5 text-[13px] font-semibold text-[#1e1b4b] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#1e1b4b]/30 focus:border-[#7c3aed] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
    />
  );
}

function ToggleGroup({
  options,
  value,
  onChange,
  columns,
  color = "#7c3aed",
  shadow = "#5b21b6",
  glow = "rgba(124,58,237,0.5)",
  gradientFrom = "#8b5cf6",
  gradientTo = "#6d28d9",
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  columns?: number;
  color?: string;
  shadow?: string;
  glow?: string;
  gradientFrom?: string;
  gradientTo?: string;
}) {
  const activeIndex = options.findIndex((o) => o.id === value);
  const cols = columns || options.length;
  const activeRow = activeIndex >= 0 ? Math.floor(activeIndex / cols) : -1;
  const activeCol = activeIndex >= 0 ? activeIndex % cols : -1;

  return (
    <div
      className="relative grid rounded-xl p-1 text-[12px] font-extrabold transition-colors duration-200"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        backgroundColor: `${color}12`,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className="relative z-10 rounded-lg py-2.5 transition-colors duration-200"
          style={{ color: value === opt.id ? "#ffffff" : color }}
        >
          {opt.label}
        </button>
      ))}
      {activeIndex >= 0 && (
        <div
          className="absolute z-0 overflow-hidden rounded-lg transition-[top,left,box-shadow] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{
            width: `calc(${100 / cols}% - 0.25rem)`,
            height: `calc(${100 / Math.ceil(options.length / cols)}% - 0.25rem)`,
            top: `calc(${(activeRow * 100) / Math.ceil(options.length / cols)}% + 0.125rem)`,
            left: `calc(${(activeCol * 100) / cols}% + 0.125rem)`,
            background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
            boxShadow: `0 3px 0 ${shadow}, 0 6px 12px -2px ${glow}`,
          }}
        />
      )}
    </div>
  );
}

export function JoinGroup({
  initialCode,
  userName = "",
  userPhone = "",
}: {
  initialCode?: string;
  userName?: string;
  userPhone?: string;
}) {
  const t = useTranslations("join");
  const tStudents = useTranslations("students");
  const tGroups = useTranslations("groups");
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [code, setCode] = useState(initialCode || "");
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupPressed, setLookupPressed] = useState(false);
  const [sendPressed, setSendPressed] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  const [fullName, setFullName] = useState(userName);
  const [phone, setPhone] = useState(userPhone);
  const [parentPhone, setParentPhone] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const requestIdRef = useRef<string | null>(null);

  // Poll for status changes on the student's request
  useEffect(() => {
    if (!sent || !requestIdRef.current) return;
    const reqId = requestIdRef.current;
    const codeVal = code.trim().toUpperCase();

    const interval = setInterval(async () => {
      const res = await fetch(`/api/join/${codeVal}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.existing_request) return;
      if (data.existing_request.id !== reqId) return;
      const newStatus = data.existing_request.status;
      if (newStatus === "accepted") {
        setSent(false);
        setError("requestAccepted");
        setRequestStatus("accepted");
      } else if (newStatus === "rejected") {
        setSent(false);
        setError("requestRejected");
        setRequestStatus("rejected");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sent, code]);

  const levelDef = selectedLevel ? getLevelDef(selectedLevel) : null;
  const showSections = selectedLevel ? hasSections(selectedLevel) : false;
  const categories: LevelCategory[] = ["primaire", "moyen", "lycee"];

  async function handleLookup() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLookingUp(true);
    setNotFound(false);
    setGroupInfo(null);
    setError(null);
    setSent(false);
    setFormError(null);
    setRequestStatus(null);

    const res = await fetch(`/api/join/${trimmed}`);
    if (res.ok) {
      const data = await res.json();
      setGroupInfo(data);
      if (data.existing_request) {
        requestIdRef.current = data.existing_request.id;
        if (data.existing_request.status === "pending") {
          setError("requestPending");
        } else if (data.existing_request.status === "accepted") {
          setError("requestAccepted");
        }
        // rejected: no error set, show form so student can re-send
      }
    } else {
      setNotFound(true);
    }
    setLookingUp(false);
  }

  async function handleSendRequest() {
    if (!groupInfo) return;

    if (!fullName.trim() || !selectedLevel || !parentPhone.trim()) {
      setFormError("missingFields");
      return;
    }

    setSending(true);
    setError(null);
    setFormError(null);

    try {
      const res = await fetch(`/api/join/${code.trim().toUpperCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          parent_phone: parentPhone.trim(),
          level: selectedLevel,
          section: showSections ? selectedSection || null : null,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        requestIdRef.current = data.id;
        setSent(true);
        setRequestStatus("pending");
      } else {
        const data = await res.json();
        console.error("Join request error:", data);
        if (data.error === "already_requested") setError("alreadyRequested");
        else if (data.error === "group_full") setError("groupFull");
        else if (data.error === "own_group") setError("ownGroup");
        else if (data.error === "missing_fields") setFormError("missingFields");
        else setError("generic");
      }
    } catch (e) {
      console.error("Join request exception:", e);
      setError("generic");
    }
    setSending(false);
  }

  function handleRetry() {
    setError(null);
    setRequestStatus(null);
  }

  const groupLevelDef = groupInfo ? getLevelDef(groupInfo.level) : null;
  const isRejected = error === "requestRejected" || requestStatus === "rejected";
  const canSendRequest = groupInfo && !sent && !error;
  const canRetry = isRejected;

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff]"
    >
      <motion.div variants={fadeUp} className="px-5 pb-1 pt-10">
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">
          {t("title")}
        </h1>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 scrollbar-hide">
        {/* Code input */}
        <motion.div variants={fadeUp}>
          <FieldLabel>{t("enterCode")}</FieldLabel>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("codePlaceholder")}
              maxLength={6}
              className="h-12 flex-1 rounded-xl border-2 border-[#ddd6fe] bg-[#f9f7ff] px-4 font-mono text-[18px] font-black tracking-[0.15em] text-[#7c3aed] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#1e1b4b]/20 focus:border-[#7c3aed] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
            />
            <button
              onPointerDown={() => setLookupPressed(true)}
              onPointerUp={() => setLookupPressed(false)}
              onPointerLeave={() => setLookupPressed(false)}
              onClick={handleLookup}
              disabled={lookingUp || !code.trim()}
              className="rounded-xl px-5 text-[13px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                transform: `translateY(${lookupPressed ? 3 : 0}px)`,
                boxShadow: lookupPressed
                  ? "0 0px 0 #5b21b6"
                  : "0 3px 0 #5b21b6, 0 6px 12px -4px rgba(124,58,237,0.4)",
              }}
            >
              {lookingUp ? "..." : t("lookup")}
            </button>
          </div>
        </motion.div>

        {/* Not found */}
        {notFound && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-600"
          >
            {t("notFound")}
          </motion.p>
        )}

        {/* Group info card */}
        <AnimatePresence>
          {groupInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.35, ease }}
              className="mt-5 rounded-2xl bg-white p-5"
              style={{ boxShadow: "0 4px 0 #e9e5f5, 0 12px 32px -8px rgba(30,27,75,0.12)" }}
            >
              <p className="text-[11px] font-bold uppercase text-[#1e1b4b]/30">
                {t("groupInfo")}
              </p>
              <h2 className="mt-1 text-[18px] font-extrabold text-[#1e1b4b]">
                {groupInfo.name}
              </h2>
              <p className="mt-0.5 text-[12px] font-semibold text-[#1e1b4b]/40">
                {groupLevelDef?.label || groupInfo.level}
                {groupInfo.section ? ` - ${groupInfo.section}` : ""}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-lg bg-[#f0ecff] px-2.5 py-1 text-[11px] font-bold text-[#7c3aed]">
                  {groupInfo.price} DA
                </span>
                <span className="rounded-lg bg-[#f0fdf4] px-2.5 py-1 text-[11px] font-bold text-[#22c55e]">
                  {tGroups(paymentModeKeys[groupInfo.payment_mode] || "monthly")}
                </span>
                <span className="rounded-lg bg-[#fff7ed] px-2.5 py-1 text-[11px] font-bold text-[#f97316]">
                  {t("spots", { count: groupInfo.member_count, max: groupInfo.capacity })}
                </span>
              </div>

              {/* Error / status */}
              {error && !canRetry && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700">
                  {t(error as "requestPending" | "requestAccepted" | "alreadyRequested" | "ownGroup" | "groupFull" | "generic")}
                </p>
              )}

              {/* Rejected: show message + retry button */}
              {canRetry && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-3 rounded-xl bg-red-50 px-3 py-3"
                >
                  <p className="text-[13px] font-extrabold text-red-600">
                    {t("requestRejected")}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-red-500/60">
                    {t("requestRejectedDesc")}
                  </p>
                  <button
                    onClick={handleRetry}
                    className="mt-2 rounded-lg bg-red-100 px-3 py-1.5 text-[12px] font-bold text-red-600 transition-[transform] duration-[80ms] active:translate-y-[1px]"
                  >
                    {t("retryRequest")}
                  </button>
                </motion.div>
              )}

              {/* Success - waiting for teacher */}
              {sent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-3 rounded-xl bg-green-50 px-3 py-3 text-center"
                >
                  <p className="text-[14px] font-extrabold text-green-700">
                    {t("requestSent")}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-green-600/60">
                    {t("requestSentDesc")}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Student info form */}
        <AnimatePresence>
          {canSendRequest && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease, delay: 0.1 }}
              className="mt-4 rounded-2xl bg-white p-5"
              style={{ boxShadow: "0 4px 0 #e9e5f5, 0 12px 32px -8px rgba(30,27,75,0.12)" }}
            >
              <p className="text-[11px] font-bold uppercase text-[#1e1b4b]/30">
                {t("yourInfo")}
              </p>

              {/* Full name */}
              <div className="mt-3">
                <FieldLabel>{tStudents("fullName")}</FieldLabel>
                <InputField
                  value={fullName}
                  onChange={setFullName}
                  placeholder={tStudents("fullNamePlaceholder")}
                  readOnly={!!userName}
                />
              </div>

              {/* Phones */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>{tStudents("phone")}</FieldLabel>
                  <InputField
                    value={phone}
                    onChange={setPhone}
                    placeholder={tStudents("phonePlaceholder")}
                    type="tel"
                    readOnly={!!userPhone}
                  />
                </div>
                <div>
                  <FieldLabel>{tStudents("parentPhone")} *</FieldLabel>
                  <InputField
                    value={parentPhone}
                    onChange={setParentPhone}
                    placeholder={tStudents("parentPhonePlaceholder")}
                    type="tel"
                  />
                </div>
              </div>

              {/* Level picker */}
              <div className="mt-3">
                <FieldLabel>{tStudents("level")}</FieldLabel>
                <div className="flex flex-col gap-3">
                  {categories.map((cat) => {
                    const catLevels = levels.filter((l) => l.category === cat);
                    const catLabel = categoryLabels[cat][locale === "ar" ? "ar" : "fr"];
                    const catActive = catLevels.some((l) => l.id === selectedLevel);
                    return (
                      <div key={cat}>
                        <p className="mb-1.5 text-[11px] font-bold text-[#1e1b4b]/30 uppercase">
                          {catLabel}
                        </p>
                        <ToggleGroup
                          options={catLevels.map((l) => ({ id: l.id, label: l.label }))}
                          value={catActive ? selectedLevel : ""}
                          onChange={(id) => {
                            setSelectedLevel(id);
                            setSelectedSection("");
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sections (if lycee) */}
              <AnimatePresence initial={false}>
                {showSections && levelDef?.sections && (
                  <motion.div
                    key={selectedLevel}
                    className="mt-3 overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <FieldLabel>{tStudents("section")}</FieldLabel>
                    <ToggleGroup
                      options={levelDef.sections.map((s) => ({ id: s, label: s }))}
                      value={selectedSection}
                      onChange={setSelectedSection}
                      columns={levelDef.sections.length <= 3 ? levelDef.sections.length : 3}
                      color="#22c55e"
                      shadow="#15803d"
                      glow="rgba(34,197,94,0.5)"
                      gradientFrom="#4ade80"
                      gradientTo="#16a34a"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Notes */}
              <div className="mt-3">
                <FieldLabel>{tStudents("notes")}</FieldLabel>
                <TextArea
                  value={notes}
                  onChange={setNotes}
                  placeholder={t("notesPlaceholder")}
                />
              </div>

              {/* Form error */}
              {formError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600"
                >
                  {t(formError as "missingFields")}
                </motion.p>
              )}

              {/* Send request button */}
              <button
                onPointerDown={() => setSendPressed(true)}
                onPointerUp={() => setSendPressed(false)}
                onPointerLeave={() => setSendPressed(false)}
                onClick={handleSendRequest}
                disabled={sending}
                className="mt-4 w-full rounded-xl py-3 text-[14px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms] disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  transform: `translateY(${sendPressed && !sending ? 4 : 0}px)`,
                  boxShadow: sendPressed && !sending
                    ? "0 0px 0 #15803d"
                    : "0 4px 0 #15803d, 0 8px 20px -6px rgba(34,197,94,0.4)",
                }}
              >
                {sending ? t("sending") : t("sendRequest")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
