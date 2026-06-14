"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLevelDef, levels, hasSections, categoryLabels, type LevelCategory } from "@/lib/levels";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { Html5Qrcode } from "html5-qrcode";

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

type ScheduleSlot = {
  day: number;
  start_time: string;
  end_time: string;
};

type GroupInfo = {
  id: string;
  name: string;
  level: string;
  section: string | null;
  capacity: number;
  price: number;
  payment_mode: string;
  schedules: ScheduleSlot[];
  member_count: number;
  existing_request: { id: string; status: string } | null;
};

type MyGroup = {
  group_id: string;
  group_name: string;
  level: string;
  section: string | null;
  schedules: ScheduleSlot[];
  enrolled_sessions: number[] | null;
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
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
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
  const [selectedSchedules, setSelectedSchedules] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanContainerRef = useRef<string>("qr-reader-" + Math.random().toString(36).slice(2, 8));

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setScanError(null);
    setScanning(true);
    await new Promise((r) => setTimeout(r, 200));

    const el = document.getElementById(scanContainerRef.current);
    if (!el) {
      setScanning(false);
      setScanError("camera_unavailable");
      return;
    }

    const scanner = new Html5Qrcode(scanContainerRef.current);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          let extracted = decodedText.trim().toUpperCase();
          try {
            const url = new URL(decodedText);
            const codeParam = url.searchParams.get("code");
            if (codeParam) extracted = codeParam.toUpperCase();
          } catch {}
          setCode(extracted);
          stopScanner();
        },
        () => {},
      );
    } catch (err: unknown) {
      await stopScanner();
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("notallowed")) {
        setScanError("camera_denied");
      } else if (msg.toLowerCase().includes("notfound") || msg.toLowerCase().includes("no camera")) {
        setScanError("camera_unavailable");
      } else {
        setScanError("camera_unavailable");
      }
    }
  }, [stopScanner]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Groups the student has already joined (shown at the bottom).
  useEffect(() => {
    fetch("/api/student/me")
      .then((r) => r.json())
      .then((data) => setMyGroups(data.groups || []))
      .catch(() => {});
  }, []);

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
      if (data.schedules?.length > 0) {
        setSelectedSchedules(data.schedules.map((_: ScheduleSlot, i: number) => i));
      }
      if (data.existing_request) {
        requestIdRef.current = data.existing_request.id;
        if (data.existing_request.status === "pending") {
          setError("requestPending");
        } else if (data.existing_request.status === "accepted") {
          setError("requestAccepted");
        }
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

    if (groupInfo.schedules?.length > 0 && selectedSchedules.length === 0) {
      setFormError("noScheduleSelected");
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
          selected_schedules: groupInfo.schedules?.length > 0 && selectedSchedules.length < groupInfo.schedules.length
            ? selectedSchedules.map((i) => groupInfo.schedules[i].day)
            : null,
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
      className="flex min-h-[100dvh] flex-col bg-[#f0fdf4]"
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
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t("codePlaceholder")}
                maxLength={6}
                className="h-12 flex-1 rounded-xl border-2 border-[#bbf7d0] bg-[#f7fef9] px-4 font-mono text-[18px] font-black tracking-[0.15em] text-[#22c55e] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#1e1b4b]/20 focus:border-[#22c55e] focus:shadow-[0_0_0_4px_rgba(34,197,94,0.12)]"
              />
              <button
                onClick={scanning ? stopScanner : startScanner}
                className="btn-push flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: scanning
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : "linear-gradient(135deg, #22c55e, #16a34a)",
                  "--push-shadow": scanning ? "#b91c1c" : "#15803d",
                  "--push-glow": scanning ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.4)",
                } as React.CSSProperties}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {scanning ? (
                    <path d="M18 6L6 18M6 6l12 12" />
                  ) : (
                    <>
                      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                      <rect x="7" y="7" width="10" height="10" rx="1" />
                    </>
                  )}
                </svg>
              </button>
            </div>

            {/* QR Scanner */}
            <AnimatePresence>
              {scanning && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <div
                    className="overflow-hidden rounded-xl border-2 border-[#22c55e]"
                    style={{ boxShadow: "0 3px 0 #15803d, 0 6px 12px -4px rgba(34,197,94,0.3)" }}
                  >
                    <div id={scanContainerRef.current} className="w-full" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {scanError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-600"
              >
                {scanError === "camera_denied"
                  ? t("cameraDenied")
                  : t("cameraUnavailable")}
              </motion.p>
            )}

            <button
              onPointerDown={() => setLookupPressed(true)}
              onPointerUp={() => setLookupPressed(false)}
              onPointerLeave={() => setLookupPressed(false)}
              onClick={handleLookup}
              disabled={lookingUp || !code.trim()}
              className="w-full rounded-xl py-3 text-[14px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #4ade80, #16a34a)",
                transform: `translateY(${lookupPressed ? 3 : 0}px)`,
                boxShadow: lookupPressed
                  ? "0 0px 0 #15803d"
                  : "0 3px 0 #15803d, 0 6px 12px -4px rgba(34,197,94,0.4)",
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
                    className="btn-push mt-2 rounded-lg bg-red-100 px-3 py-1.5 text-[12px] font-bold text-red-600"
                    style={{ "--push-shadow": "#fecaca", "--push-glow": "rgba(239,68,68,0.15)", "--push-depth": "2px" } as React.CSSProperties}
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

              {/* Schedule selection */}
              {groupInfo.schedules?.length > 1 && (
                <div className="mt-3">
                  <FieldLabel>{t("chooseSchedules")}</FieldLabel>
                  <div className="flex flex-col gap-1.5">
                    {groupInfo.schedules.map((s, i) => {
                      const selected = selectedSchedules.includes(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedSchedules(
                              selected
                                ? selectedSchedules.filter((idx) => idx !== i)
                                : [...selectedSchedules, i]
                            );
                          }}
                          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-extrabold transition-[transform,box-shadow] duration-[80ms]"
                          style={{
                            background: selected
                              ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                              : "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                            color: selected ? "#fff" : "#7c3aed",
                            transform: `translateY(${selected ? 3 : 0}px)`,
                            boxShadow: selected
                              ? "0 0px 0 #5b21b6, 0 1px 3px -1px rgba(124,58,237,0.5)"
                              : "0 3px 0 #ddd6fe, 0 6px 12px -4px rgba(124,58,237,0.15)",
                          }}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px]"
                            style={{
                              background: selected ? "rgba(255,255,255,0.25)" : "rgba(124,58,237,0.1)",
                            }}
                          >
                            {selected ? "✓" : ""}
                          </span>
                          {tGroups(`day${s.day}Short`)} {s.start_time} - {s.end_time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  {t(formError as "missingFields" | "noScheduleSelected")}
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

        {/* Groups already joined */}
        {myGroups.length > 0 && (
          <motion.div variants={fadeUp} className="mt-7">
            <p className="mb-2.5 text-[11px] font-bold uppercase text-[#1e1b4b]/30">
              {t("myGroups")}
            </p>
            <div className="flex flex-col gap-3">
              {myGroups.map((g) => {
                const def = getLevelDef(g.level);
                const enrolled = g.enrolled_sessions || [];
                const slots = (g.schedules || []).filter(
                  (s) => enrolled.length === 0 || enrolled.includes(s.day),
                );
                return (
                  <div
                    key={g.group_id}
                    className="rounded-xl bg-white p-4"
                    style={{ boxShadow: "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-extrabold text-[#1e1b4b]">
                          {g.group_name}
                        </p>
                        <p className="mt-0.5 text-[12px] font-semibold text-[#1e1b4b]/40">
                          {def?.label || g.level}
                          {g.section ? ` - ${g.section}` : ""}
                        </p>
                      </div>
                      <div
                        className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1"
                        style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <span className="text-[11px] font-bold text-[#22c55e]">
                          {t("joined")}
                        </span>
                      </div>
                    </div>
                    {slots.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {slots.map((s, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-[#faf5ff] px-1.5 py-0.5 text-[9px] font-bold text-[#7c3aed]/70"
                          >
                            {tGroups(`day${s.day}Short`)} {s.start_time}-{s.end_time}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
      <div className="h-24 shrink-0" />
      <BottomNav active="join" role="eleve" />
    </motion.main>
  );
}
