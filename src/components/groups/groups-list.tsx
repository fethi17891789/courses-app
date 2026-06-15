"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { getLevelDef, levels, hasSections, categoryLabels, type LevelCategory } from "@/lib/levels";
import type { Group, PaymentMode, Schedule } from "@/types/groups";

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

const paymentModes: { id: PaymentMode; key: string }[] = [
  { id: "monthly", key: "monthly" },
  { id: "per_session", key: "perSession" },
  { id: "weekly", key: "weekly" },
];

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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      inputMode={type === "number" ? "numeric" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-xl border-2 border-[#ddd6fe] bg-[#f9f7ff] px-3 text-[13px] font-semibold text-[#1e1b4b] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#1e1b4b]/30 focus:border-[#7c3aed] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
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
          type="button"
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

function GroupCard({
  group,
  onTap,
  wiggling,
  onLongPress,
}: {
  group: Group;
  onTap: () => void;
  wiggling: boolean;
  onLongPress: () => void;
}) {
  const t = useTranslations("groups");
  const levelDef = getLevelDef(group.level);
  const label = levelDef?.label || group.level;
  const section = group.section;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const [pressed, setPressed] = useState(false);

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    setPressed(true);
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
      onLongPress();
    }, 500);
  }, [onLongPress]);

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressed(false);
    if (!didLongPress.current && !wiggling) {
      onTap();
    }
  }, [onTap, wiggling]);

  const handlePointerLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressed(false);
  }, []);

  const schedules = group.schedules || [];

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClick={(e) => { if (didLongPress.current) { e.stopPropagation(); didLongPress.current = false; } }}
      className="w-full cursor-pointer rounded-xl bg-white p-4 text-left transition-[transform,box-shadow] duration-[80ms] select-none"
      style={{
        transform: `translateY(${pressed ? 3 : 0}px)`,
        boxShadow: wiggling
          ? "0 3px 0 #c4b5fd, 0 6px 16px -4px rgba(124,58,237,0.15)"
          : pressed
            ? "0 0px 0 #e9e5f5, 0 1px 3px -1px rgba(30,27,75,0.08)"
            : "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)",
        animation: wiggling ? "wiggle 0.25s ease-in-out infinite" : "none",
        borderColor: wiggling ? "#c4b5fd" : "transparent",
        borderWidth: "2px",
        borderStyle: "solid",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold text-[#1e1b4b]">
            {group.name}
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-[#1e1b4b]/40">
            {label}
            {section ? ` - ${section}` : ""}
          </p>
        </div>
        <div
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1"
          style={{ background: "linear-gradient(135deg, #f5f3ff, #ede9fe)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <span className="text-[12px] font-bold text-[#7c3aed]">
            {group.member_count ?? 0}
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-[#f0ecff] px-2 py-0.5 text-[10px] font-bold text-[#7c3aed]">
          {group.price} DA
        </span>
        <span className="rounded-lg bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-bold text-[#22c55e]">
          {t(paymentModeKeys[group.payment_mode] || "monthly")}
        </span>
        <span className="rounded-lg bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#f97316]">
          {t("capacity", { max: group.capacity })}
        </span>
      </div>
      {schedules.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {schedules.map((s, i) => (
            <span
              key={i}
              className="rounded-md bg-[#faf5ff] px-1.5 py-0.5 text-[9px] font-bold text-[#7c3aed]/70"
            >
              {t(`day${s.day}Short`)} {s.start_time}-{s.end_time}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function GroupsList({ groups: initialGroups }: { groups: Group[] }) {
  const t = useTranslations("groups");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const [addPressed, setAddPressed] = useState(false);
  const [createPressed, setCreatePressed] = useState(false);

  const [groups, setGroups] = useState(initialGroups);
  const [wiggleId, setWiggleId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editPaymentMode, setEditPaymentMode] = useState<PaymentMode>("monthly");
  const [editRefundAbsences, setEditRefundAbsences] = useState(false);
  const [editSchedules, setEditSchedules] = useState<Schedule[]>([]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const categories: LevelCategory[] = ["primaire", "moyen", "lycee"];

  function openEdit(group: Group) {
    setEditGroup(group);
    setEditName(group.name);
    setEditLevel(group.level);
    setEditSection(group.section || "");
    setEditCapacity(String(group.capacity));
    setEditPrice(String(group.price));
    setEditPaymentMode(group.payment_mode);
    setEditRefundAbsences(group.refund_absences || false);
    setEditSchedules(group.schedules || []);
    setEditError(null);
    setWiggleId(null);
  }

  async function handleSaveEdit() {
    if (!editGroup || !editName.trim() || !editLevel) return;
    setSaving(true);
    setEditError(null);
    try {
      const showSections = hasSections(editLevel);
      const res = await fetch(`/api/groups/${editGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          level: editLevel,
          section: showSections ? editSection || null : null,
          capacity: parseInt(editCapacity) || 30,
          price: parseInt(editPrice) || 0,
          payment_mode: editPaymentMode,
          refund_absences: editPaymentMode !== "per_session" && editRefundAbsences,
          schedules: editSchedules,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setGroups(groups.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
        setEditGroup(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error === "schedule_conflict" ? "schedule_conflict" : "generic");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (res.ok) {
        setGroups(groups.filter((g) => g.id !== id));
        setShowDeleteConfirm(null);
        setWiggleId(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  const editLevelDef = editLevel ? getLevelDef(editLevel) : null;
  const editShowSections = editLevel ? hasSections(editLevel) : false;

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff]"
      onClick={() => { if (wiggleId) setWiggleId(null); }}
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between px-5 pb-1 pt-10">
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">
          {t("title")}
        </h1>
        <button
          onPointerDown={() => setAddPressed(true)}
          onPointerUp={() => setAddPressed(false)}
          onPointerLeave={() => setAddPressed(false)}
          onClick={() => router.push(`/${locale}/groups/create`)}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-[transform,box-shadow] duration-[80ms]"
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
            transform: `translateY(${addPressed ? 3 : 0}px)`,
            boxShadow: addPressed
              ? "0 0px 0 #5b21b6, 0 1px 3px -1px rgba(124,58,237,0.4)"
              : "0 3px 0 #5b21b6, 0 6px 12px -4px rgba(124,58,237,0.4)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 4a1.5 1.5 0 0 1 1.5 1.5v5h5a1.5 1.5 0 0 1 0 3h-5v5a1.5 1.5 0 0 1-3 0v-5h-5a1.5 1.5 0 0 1 0-3h5v-5A1.5 1.5 0 0 1 12 4z"
              fill="white"
            />
          </svg>
        </button>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 scrollbar-hide">
        {groups.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center justify-center pt-16"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                boxShadow: "0 3px 0 #e9e5f5",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M4 2a4 4 0 0 0-4 4v12a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4V6a4 4 0 0 0-4-4H4zm8 4a1.5 1.5 0 0 1 1.5 1.5v3h3a1.5 1.5 0 0 1 0 3h-3v3a1.5 1.5 0 0 1-3 0v-3h-3a1.5 1.5 0 0 1 0-3h3v-3A1.5 1.5 0 0 1 12 6z"
                  fill="#c4b5fd"
                />
              </svg>
            </div>
            <p className="mt-4 text-[14px] font-extrabold text-[#1e1b4b]">
              {t("empty")}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[#1e1b4b]/40">
              {t("emptyDesc")}
            </p>
            <button
              onPointerDown={() => setCreatePressed(true)}
              onPointerUp={() => setCreatePressed(false)}
              onPointerLeave={() => setCreatePressed(false)}
              onClick={() => router.push(`/${locale}/groups/create`)}
              className="mt-5 rounded-xl px-5 py-3 text-[13px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms]"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                transform: `translateY(${createPressed ? 4 : 0}px)`,
                boxShadow: createPressed
                  ? "0 0px 0 #5b21b6, 0 2px 4px -2px rgba(124,58,237,0.4)"
                  : "0 4px 0 #5b21b6, 0 8px 20px -6px rgba(124,58,237,0.4)",
              }}
            >
              {t("createCta")}
            </button>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.id} className="relative">
                <GroupCard
                  group={group}
                  onTap={() => router.push(`/${locale}/groups/${group.id}`)}
                  wiggling={wiggleId === group.id}
                  onLongPress={() => setWiggleId(group.id)}
                />
                <AnimatePresence>
                  {wiggleId === group.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute -top-2 right-2 z-10 flex gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(group);
                        }}
                        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-extrabold text-white"
                        style={{
                          background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                          boxShadow: "0 2px 0 #5b21b6",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        {t("edit")}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(group.id);
                        }}
                        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-extrabold text-white"
                        style={{
                          background: "linear-gradient(135deg, #ef4444, #dc2626)",
                          boxShadow: "0 2px 0 #b91c1c",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        {t("deleteGroup")}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}
        <div className="h-28" />
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-5"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.25, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-5"
              style={{ boxShadow: "0 4px 0 #e9e5f5, 0 16px 48px -12px rgba(30,27,75,0.2)" }}
            >
              <p className="text-[14px] font-extrabold text-[#1e1b4b]">
                {t("deleteGroup")}
              </p>
              <p className="mt-2 text-[12px] font-semibold text-[#1e1b4b]/50">
                {t("deleteConfirm")}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="btn-push rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed]"
                  style={{ "--push-shadow": "#ddd6fe", "--push-glow": "rgba(124,58,237,0.1)" } as React.CSSProperties}
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={deleting}
                  className="btn-push rounded-xl py-3 text-[13px] font-extrabold text-white disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    "--push-shadow": "#b91c1c",
                    "--push-glow": "rgba(239,68,68,0.4)",
                  } as React.CSSProperties}
                >
                  {t("confirm")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit group overlay */}
      <AnimatePresence>
        {editGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30"
            onClick={() => setEditGroup(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 scrollbar-hide"
              style={{
                maxHeight: "85dvh",
                boxShadow: "0 -4px 0 #e9e5f5, 0 -16px 48px -12px rgba(30,27,75,0.2)",
              }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e9e5f5]" />
              <p className="text-[16px] font-extrabold text-[#1e1b4b]">
                {t("editGroup")}
              </p>

              <div className="mt-4">
                <FieldLabel>{t("name")}</FieldLabel>
                <InputField value={editName} onChange={setEditName} placeholder={t("namePlaceholder")} />
              </div>

              <div className="mt-4">
                <FieldLabel>{t("level")}</FieldLabel>
                <div className="flex flex-col gap-3">
                  {categories.map((cat) => {
                    const catLevels = levels.filter((l) => l.category === cat);
                    const catLabel = categoryLabels[cat][locale === "ar" ? "ar" : "fr"];
                    const catActive = catLevels.some((l) => l.id === editLevel);
                    return (
                      <div key={cat}>
                        <p className="mb-1.5 text-[11px] font-bold text-[#1e1b4b]/30 uppercase">
                          {catLabel}
                        </p>
                        <ToggleGroup
                          options={catLevels.map((l) => ({ id: l.id, label: l.label }))}
                          value={catActive ? editLevel : ""}
                          onChange={(id) => {
                            setEditLevel(id);
                            setEditSection("");
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {editShowSections && editLevelDef?.sections && (
                  <motion.div
                    key={editLevel}
                    className="mt-4 overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <FieldLabel>{t("section")}</FieldLabel>
                    <ToggleGroup
                      options={editLevelDef.sections.map((s) => ({ id: s, label: s }))}
                      value={editSection}
                      onChange={setEditSection}
                      columns={editLevelDef.sections.length <= 3 ? editLevelDef.sections.length : 3}
                      color="#22c55e"
                      shadow="#15803d"
                      glow="rgba(34,197,94,0.5)"
                      gradientFrom="#4ade80"
                      gradientTo="#16a34a"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>{t("capacityLabel")}</FieldLabel>
                  <InputField value={editCapacity} onChange={setEditCapacity} type="number" />
                </div>
                <div>
                  <FieldLabel>{t("price")} ({t("priceUnit")})</FieldLabel>
                  <InputField value={editPrice} onChange={setEditPrice} placeholder="0" type="number" />
                </div>
              </div>

              <div className="mt-4">
                <FieldLabel>{t("paymentMode")}</FieldLabel>
                <ToggleGroup
                  options={paymentModes.map((pm) => ({ id: pm.id, label: t(pm.key) }))}
                  value={editPaymentMode}
                  onChange={(id) => setEditPaymentMode(id as PaymentMode)}
                  color="#f97316"
                  shadow="#c2410c"
                  glow="rgba(249,115,22,0.5)"
                  gradientFrom="#fb923c"
                  gradientTo="#ea580c"
                />
              </div>

              {/* Refund absences toggle */}
              <AnimatePresence initial={false}>
                {editPaymentMode !== "per_session" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4">
                      <FieldLabel>{t("refundAbsences")}</FieldLabel>
                      <ToggleGroup
                        options={[
                          { id: "no", label: t("no") },
                          { id: "yes", label: t("yes") },
                        ]}
                        value={editRefundAbsences ? "yes" : "no"}
                        onChange={(id) => setEditRefundAbsences(id === "yes")}
                        color="#22c55e"
                        shadow="#15803d"
                        glow="rgba(34,197,94,0.5)"
                        gradientFrom="#4ade80"
                        gradientTo="#16a34a"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Edit schedules */}
              <div className="mt-4">
                <FieldLabel>{t("schedules")}</FieldLabel>
                <div className="flex flex-col gap-3">
                  <AnimatePresence initial={false}>
                    {editSchedules.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-2xl bg-[#f9f7ff] p-3" style={{ boxShadow: "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)" }}>
                          <div className="mb-2.5 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#1e1b4b]/40">{t("schedules")} {i + 1}</span>
                            <button
                              type="button"
                              onClick={() => setEditSchedules(editSchedules.filter((_, j) => j !== i))}
                              className="btn-push flex h-7 w-7 items-center justify-center rounded-lg"
                              style={{
                                background: "linear-gradient(135deg, #fecaca, #fca5a5)",
                                "--push-shadow": "#f87171",
                                "--push-glow": "rgba(239,68,68,0.2)",
                                "--push-depth": "2px",
                              } as React.CSSProperties}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="mb-2.5 grid grid-cols-7 gap-1">
                            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  const updated = [...editSchedules];
                                  updated[i] = { ...updated[i], day: d };
                                  setEditSchedules(updated);
                                }}
                                className="rounded-lg py-1.5 text-[10px] font-extrabold transition-[transform,box-shadow,background,color] duration-[80ms]"
                                style={{
                                  background: s.day === d ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" : "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                                  color: s.day === d ? "#fff" : "#7c3aed",
                                  transform: `translateY(${s.day === d ? 3 : 0}px)`,
                                  boxShadow: s.day === d
                                    ? "0 0px 0 #5b21b6, 0 1px 3px -1px rgba(124,58,237,0.5)"
                                    : "0 3px 0 #ddd6fe, 0 6px 12px -4px rgba(124,58,237,0.15)",
                                }}
                              >
                                {t(`day${d}Short`)}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <span className="mb-1 block text-[10px] font-bold text-[#1e1b4b]/40">{t("startTime")}</span>
                              <input
                                type="time"
                                value={s.start_time}
                                onChange={(e) => {
                                  const updated = [...editSchedules];
                                  updated[i] = { ...updated[i], start_time: e.target.value };
                                  setEditSchedules(updated);
                                }}
                                className="h-11 w-full rounded-xl border-2 border-[#ddd6fe] bg-white px-3 text-[13px] font-semibold text-[#1e1b4b] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#7c3aed] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
                              />
                            </div>
                            <div className="flex-1">
                              <span className="mb-1 block text-[10px] font-bold text-[#1e1b4b]/40">{t("endTime")}</span>
                              <input
                                type="time"
                                value={s.end_time}
                                onChange={(e) => {
                                  const updated = [...editSchedules];
                                  updated[i] = { ...updated[i], end_time: e.target.value };
                                  setEditSchedules(updated);
                                }}
                                className="h-11 w-full rounded-xl border-2 border-[#ddd6fe] bg-white px-3 text-[13px] font-semibold text-[#1e1b4b] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#7c3aed] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <button
                  type="button"
                  onClick={() => setEditSchedules([...editSchedules, { day: 0, start_time: "08:00", end_time: "09:00" }])}
                  className="btn-push mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-[12px] font-extrabold text-[#7c3aed]"
                  style={{
                    background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                    "--push-shadow": "#e9e5f5",
                    "--push-glow": "rgba(124,58,237,0.1)",
                  } as React.CSSProperties}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {t("addSession")}
                </button>
              </div>

              {editError && (
                <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                  {editError === "schedule_conflict" ? t("scheduleConflict") : t("editError")}
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setEditGroup(null)}
                  className="btn-push rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed]"
                  style={{ "--push-shadow": "#ddd6fe", "--push-glow": "rgba(124,58,237,0.1)" } as React.CSSProperties}
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="btn-push rounded-xl py-3 text-[13px] font-extrabold text-white disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                    "--push-shadow": "#5b21b6",
                    "--push-glow": "rgba(124,58,237,0.4)",
                  } as React.CSSProperties}
                >
                  {saving ? t("saving") : t("save")}
                </button>
              </div>
              <div className="h-6" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav active="groups" />
    </motion.main>
  );
}
