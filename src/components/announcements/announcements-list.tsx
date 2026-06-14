"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { getLevelDef } from "@/lib/levels";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import type { Announcement } from "@/types/announcements";
import type { Group } from "@/types/groups";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

type SlimGroup = Pick<Group, "id" | "name" | "level" | "section">;

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(
    locale === "ar" ? "ar-DZ" : "fr-FR",
    { day: "numeric", month: "short", year: "numeric" },
  );
}

function groupLabel(g: SlimGroup) {
  const def = getLevelDef(g.level);
  const lvl = def?.label || g.level;
  return g.section ? `${g.name} - ${lvl} ${g.section}` : `${g.name} - ${lvl}`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[12px] font-bold text-[#1e1b4b]/50">
      {children}
    </span>
  );
}

function AnnouncementCard({
  announcement,
  groups,
  onTap,
  wiggling,
  onLongPress,
  locale,
}: {
  announcement: Announcement;
  groups: SlimGroup[];
  onTap: () => void;
  wiggling: boolean;
  onLongPress: () => void;
  locale: string;
}) {
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
    if (!didLongPress.current && !wiggling) onTap();
  }, [onTap, wiggling]);

  const handlePointerLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressed(false);
  }, []);

  const targeted = groups.filter((g) => announcement.group_ids.includes(g.id));

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClick={(e) => {
        if (didLongPress.current) {
          e.stopPropagation();
          didLongPress.current = false;
        }
      }}
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
        <p className="min-w-0 flex-1 text-[15px] font-extrabold text-[#1e1b4b]">
          {announcement.title}
        </p>
        {announcement.pinned && (
          <span
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-[#f97316]"
            style={{ background: "linear-gradient(135deg, #fff7ed, #ffedd5)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17v5" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
            </svg>
          </span>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-[12px] font-semibold text-[#1e1b4b]/50">
        {announcement.body}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {targeted.map((g) => (
          <span
            key={g.id}
            className="rounded-lg bg-[#f0ecff] px-2 py-0.5 text-[10px] font-bold text-[#7c3aed]"
          >
            {g.name}
          </span>
        ))}
        <span className="ml-auto text-[10px] font-semibold text-[#1e1b4b]/30">
          {formatDate(announcement.created_at, locale)}
        </span>
      </div>
    </div>
  );
}

function GroupPicker({
  groups,
  selected,
  onToggle,
}: {
  groups: SlimGroup[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g) => {
        const active = selected.includes(g.id);
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onToggle(g.id)}
            className="rounded-xl px-3 py-2 text-[11px] font-extrabold transition-[transform,box-shadow,background,color] duration-[80ms]"
            style={{
              background: active
                ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                : "linear-gradient(135deg, #f5f3ff, #ede9fe)",
              color: active ? "#fff" : "#7c3aed",
              transform: `translateY(${active ? 3 : 0}px)`,
              boxShadow: active
                ? "0 0px 0 #5b21b6, 0 1px 3px -1px rgba(124,58,237,0.5)"
                : "0 3px 0 #ddd6fe, 0 6px 12px -4px rgba(124,58,237,0.15)",
            }}
          >
            {groupLabel(g)}
          </button>
        );
      })}
    </div>
  );
}

export function AnnouncementsList({
  announcements: initial,
  groups,
}: {
  announcements: Announcement[];
  groups: SlimGroup[];
}) {
  const t = useTranslations("announcements");
  const locale = useLocale();

  const [announcements, setAnnouncements] = useState(initial);
  const [addPressed, setAddPressed] = useState(false);
  const [emptyPressed, setEmptyPressed] = useState(false);
  const [wiggleId, setWiggleId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sheetJustOpened = useRef(false);

  // Form sheet (create when editId is null, edit otherwise).
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openSheet() {
    sheetJustOpened.current = true;
    setTimeout(() => { sheetJustOpened.current = false; }, 400);
    setSheetOpen(true);
  }

  function openCreate() {
    setEditId(null);
    setTitle("");
    setBody("");
    setSelectedGroups([]);
    setError(null);
    openSheet();
  }

  function openEdit(a: Announcement) {
    setEditId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setSelectedGroups(a.group_ids);
    setError(null);
    setWiggleId(null);
    openSheet();
  }

  function toggleGroup(id: string) {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    if (!title.trim() || !body.trim()) {
      setError("missing_fields");
      return;
    }
    if (selectedGroups.length === 0) {
      setError("no_groups");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editId) {
        const res = await fetch(`/api/announcements/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            group_ids: selectedGroups,
          }),
        });
        if (!res.ok) {
          setError("generic");
          return;
        }
        const updated = await res.json();
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)),
        );
      } else {
        const res = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            group_ids: selectedGroups,
          }),
        });
        if (!res.ok) {
          setError("generic");
          return;
        }
        const created = await res.json();
        setAnnouncements((prev) => [created, ...prev]);
      }
      setSheetOpen(false);
    } catch {
      setError("generic");
    } finally {
      setSaving(false);
    }
  }

  async function handlePin(a: Announcement) {
    setWiggleId(null);
    const next = !a.pinned;
    const res = await fetch(`/api/announcements/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: next }),
    });
    if (res.ok) {
      setAnnouncements((prev) => {
        const updated = prev.map((x) =>
          x.id === a.id ? { ...x, pinned: next } : x,
        );
        return [...updated].sort((p, q) => {
          if (p.pinned !== q.pinned) return p.pinned ? -1 : 1;
          return q.created_at.localeCompare(p.created_at);
        });
      });
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        setShowDeleteConfirm(null);
        setWiggleId(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  const hasGroups = groups.length > 0;

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff]"
      onClick={() => {
        if (wiggleId) setWiggleId(null);
      }}
    >
      <motion.div
        variants={fadeUp}
        className="flex items-center justify-between px-5 pb-1 pt-10"
      >
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">{t("title")}</h1>
        {hasGroups && (
          <button
            onPointerDown={() => setAddPressed(true)}
            onPointerUp={() => setAddPressed(false)}
            onPointerLeave={() => setAddPressed(false)}
            onClick={openCreate}
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
        )}
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 scrollbar-hide">
        {!hasGroups ? (
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center justify-center pt-16 text-center"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                boxShadow: "0 3px 0 #e9e5f5",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l18-5v12L3 14v-3z" />
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
              </svg>
            </div>
            <p className="mt-4 text-[14px] font-extrabold text-[#1e1b4b]">
              {t("noGroups")}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[#1e1b4b]/40">
              {t("noGroupsDesc")}
            </p>
          </motion.div>
        ) : announcements.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center justify-center pt-16 text-center"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                boxShadow: "0 3px 0 #e9e5f5",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l18-5v12L3 14v-3z" />
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
              </svg>
            </div>
            <p className="mt-4 text-[14px] font-extrabold text-[#1e1b4b]">
              {t("empty")}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[#1e1b4b]/40">
              {t("emptyDesc")}
            </p>
            <button
              onPointerDown={() => setEmptyPressed(true)}
              onPointerUp={() => setEmptyPressed(false)}
              onPointerLeave={() => setEmptyPressed(false)}
              onClick={openCreate}
              className="mt-5 rounded-xl px-5 py-3 text-[13px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms]"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                transform: `translateY(${emptyPressed ? 4 : 0}px)`,
                boxShadow: emptyPressed
                  ? "0 0px 0 #5b21b6, 0 2px 4px -2px rgba(124,58,237,0.4)"
                  : "0 4px 0 #5b21b6, 0 8px 20px -6px rgba(124,58,237,0.4)",
              }}
            >
              {t("createCta")}
            </button>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="flex flex-col gap-3">
            {announcements.map((a) => (
              <div key={a.id} className="relative">
                <AnnouncementCard
                  announcement={a}
                  groups={groups}
                  locale={locale}
                  onTap={() => openEdit(a)}
                  wiggling={wiggleId === a.id}
                  onLongPress={() => setWiggleId(a.id)}
                />
                <AnimatePresence>
                  {wiggleId === a.id && (
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
                          handlePin(a);
                        }}
                        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-extrabold text-white"
                        style={{
                          background: "linear-gradient(135deg, #fb923c, #ea580c)",
                          boxShadow: "0 2px 0 #c2410c",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 17v5" />
                          <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                        </svg>
                        {a.pinned ? t("unpin") : t("pin")}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(a);
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
                          setShowDeleteConfirm(a.id);
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
                        {t("delete")}
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

      {/* Delete confirmation */}
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
                {t("deleteTitle")}
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

      {/* Create / edit sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30"
            onClick={() => { if (!sheetJustOpened.current) setSheetOpen(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 scrollbar-hide"
              style={{
                maxHeight: "88dvh",
                boxShadow: "0 -4px 0 #e9e5f5, 0 -16px 48px -12px rgba(30,27,75,0.2)",
              }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e9e5f5]" />
              <p className="text-[16px] font-extrabold text-[#1e1b4b]">
                {editId ? t("editTitle") : t("newTitle")}
              </p>

              <div className="mt-4">
                <FieldLabel>{t("titleLabel")}</FieldLabel>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  maxLength={120}
                  className="h-11 w-full rounded-xl border-2 border-[#ddd6fe] bg-[#f9f7ff] px-3 text-[13px] font-semibold text-[#1e1b4b] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#1e1b4b]/30 focus:border-[#7c3aed] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
                />
              </div>

              <div className="mt-4">
                <FieldLabel>{t("bodyLabel")}</FieldLabel>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t("bodyPlaceholder")}
                  rows={5}
                  maxLength={4000}
                  className="w-full resize-none rounded-xl border-2 border-[#ddd6fe] bg-[#f9f7ff] px-3 py-2.5 text-[13px] font-semibold leading-relaxed text-[#1e1b4b] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#1e1b4b]/30 focus:border-[#7c3aed] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
                />
              </div>

              <div className="mt-4">
                <FieldLabel>{t("targetGroups")}</FieldLabel>
                <GroupPicker
                  groups={groups}
                  selected={selectedGroups}
                  onToggle={toggleGroup}
                />
              </div>

              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                  {error === "missing_fields"
                    ? t("errorMissing")
                    : error === "no_groups"
                      ? t("errorNoGroups")
                      : t("errorGeneric")}
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSheetOpen(false)}
                  className="btn-push rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed]"
                  style={{ "--push-shadow": "#ddd6fe", "--push-glow": "rgba(124,58,237,0.1)" } as React.CSSProperties}
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-push rounded-xl py-3 text-[13px] font-extrabold text-white disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                    "--push-shadow": "#5b21b6",
                    "--push-glow": "rgba(124,58,237,0.4)",
                  } as React.CSSProperties}
                >
                  {saving ? t("publishing") : editId ? t("save") : t("publish")}
                </button>
              </div>
              <div className="h-6" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav active="announcements" />
    </motion.main>
  );
}
