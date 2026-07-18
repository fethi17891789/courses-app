"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { getCache, setCache } from "@/lib/page-cache";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useSchoolTeachers, TeacherFilter } from "@/components/dashboard/teacher-scope";
import { levels, hasSections, getLevelDef, categoryLabels, type LevelCategory } from "@/lib/levels";
import { ListSkeleton } from "@/components/ui/skeleton";
import type { Student } from "@/types/students";
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
      inputMode={type === "tel" ? "tel" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-xl border-2 border-[#ddd6fe] bg-[#f9f7ff] px-3 text-[13px] font-semibold text-[#1e1b4b] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#1e1b4b]/30 focus:border-[#7c3aed] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
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
          className="absolute z-0 overflow-hidden rounded-lg transition-[top,inset-inline-start,box-shadow] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{
            width: `calc(${100 / cols}% - 0.25rem)`,
            height: `calc(${100 / Math.ceil(options.length / cols)}% - 0.25rem)`,
            top: `calc(${(activeRow * 100) / Math.ceil(options.length / cols)}% + 0.125rem)`,
            insetInlineStart: `calc(${(activeCol * 100) / cols}% + 0.125rem)`,
            background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
            boxShadow: `0 3px 0 ${shadow}, 0 6px 12px -2px ${glow}`,
          }}
        />
      )}
    </div>
  );
}

function StudentCard({
  student,
  onTap,
  onPrefetch,
  wiggling,
  onLongPress,
}: {
  student: Student;
  onTap: () => void;
  onPrefetch?: () => void;
  wiggling: boolean;
  onLongPress: () => void;
}) {
  const t = useTranslations("students");
  const levelDef = getLevelDef(student.level);
  const label = levelDef?.label || student.level;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const [pressed, setPressed] = useState(false);

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    setPressed(true);
    onPrefetch?.();
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
      onLongPress();
    }, 500);
  }, [onLongPress, onPrefetch]);

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

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onClick={(e) => { if (didLongPress.current) { e.stopPropagation(); didLongPress.current = false; } }}
      onContextMenu={(e) => e.preventDefault()}
      className="w-full cursor-pointer select-none rounded-xl bg-white p-4 text-left transition-[transform,box-shadow] duration-[80ms]"
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
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[13px] font-black text-white"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
        >
          {student.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-extrabold text-[#1e1b4b]">
            {student.full_name}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#1e1b4b]/40">
            {label}
            {student.section ? ` - ${student.section}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-lg bg-[#f0ecff] px-2 py-0.5 text-[10px] font-bold text-[#7c3aed]">
            {t("groupCount", { count: student.group_count ?? 0 })}
          </span>
          {student.phone && (
            <span className="text-[10px] font-semibold text-[#1e1b4b]/30">
              {student.phone}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function StudentsList() {
  const t = useTranslations("students");
  const tGroups = useTranslations("groups");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [students, setStudents] = useState<Student[]>(() => getCache<Student[]>("students") ?? []);
  const [loading, setLoading] = useState(() => getCache<Student[]>("students") === null);
  const [search, setSearch] = useState("");

  // Vue directeur : profs de l'ecole (badge + filtre). Vide pour un prof normal.
  const teachers = useSchoolTeachers();
  const isDirector = teachers.length > 1;
  const [teacherFilter, setTeacherFilter] = useState<string | null>(null);
  const visibleStudents = teacherFilter
    ? students.filter((s) => (s.teacher_ids ?? [s.teacher_id]).includes(teacherFilter))
    : students;
  const [addPressed, setAddPressed] = useState(false);
  const [createPressed, setCreatePressed] = useState(false);

  // Long-press wiggle + its sub-flows
  const [wiggleId, setWiggleId] = useState<string | null>(null);
  const [accountMsg, setAccountMsg] = useState(false);

  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [assignStudent, setAssignStudent] = useState<Student | null>(null);
  const [assignGroups, setAssignGroups] = useState<Group[]>([]);
  const [assignGroupId, setAssignGroupId] = useState<string | null>(null);
  const [assignSessions, setAssignSessions] = useState<number[]>([]);
  // Existing memberships of the student being assigned: groupId -> { memberId, enrolled days (null = all) }
  const [assignMemberships, setAssignMemberships] = useState<Record<string, { id: string; enrolled: number[] | null }>>({});
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStudents = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/students?${params}`);
    if (res.ok) {
      const data = await res.json();
      if (!search.trim()) setCache("students", data);
      setStudents(data);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchStudents, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchStudents, search]);

  const editLevelDef = editLevel ? getLevelDef(editLevel) : null;
  const editShowSections = editLevel ? hasSections(editLevel) : false;
  const categories: LevelCategory[] = ["primaire", "moyen", "lycee"];

  function openEdit(s: Student) {
    setWiggleId(null);
    if (s.auth_user_id) {
      setAccountMsg(true);
      return;
    }
    setEditStudent(s);
    setEditName(s.full_name);
    setEditPhone(s.phone || "");
    setEditParentPhone(s.parent_phone || "");
    setEditLevel(s.level);
    setEditSection(s.section || "");
    setEditNotes(s.notes || "");
    setEditError(null);
  }

  async function saveEdit() {
    if (!editStudent || !editName.trim() || !editLevel) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/students/${editStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editName.trim(),
          phone: editPhone.trim() || null,
          parent_phone: editParentPhone.trim() || null,
          level: editLevel,
          section: editShowSections ? editSection || null : null,
          notes: editNotes.trim() || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setStudents((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
        setEditStudent(null);
      } else {
        setEditError("generic");
      }
    } catch {
      setEditError("generic");
    } finally {
      setSavingEdit(false);
    }
  }

  async function openAssign(student: Student) {
    setWiggleId(null);
    setAssignStudent(student);
    setAssignError(null);
    setAssignGroups([]);
    setAssignGroupId(null);
    setAssignSessions([]);
    setAssignMemberships({});

    const [meRes, groupsRes] = await Promise.all([
      fetch(`/api/students/${student.id}`),
      fetch("/api/groups"),
    ]);
    const me = meRes.ok ? await meRes.json() : null;
    const allGroups: Group[] = groupsRes.ok ? await groupsRes.json() : [];

    // Map current memberships of this student.
    const memberships: Record<string, { id: string; enrolled: number[] | null }> = {};
    for (const gm of me?.group_members || []) {
      memberships[gm.group_id] = { id: gm.id, enrolled: gm.enrolled_sessions ?? null };
    }
    setAssignMemberships(memberships);

    // Hide groups where the student already occupies every session.
    // Sessions are identified by their index in the group's schedules array.
    const available = allGroups.filter((g) => {
      const m = memberships[g.id];
      if (!m) return true;
      const allIdx = (g.schedules || []).map((_, i) => i);
      if (allIdx.length === 0) return false; // no sessions + already member -> nothing to add
      if (m.enrolled === null) return false; // enrolled in all -> hide
      return !allIdx.every((i) => m.enrolled!.includes(i)); // hide only if covers all
    });
    setAssignGroups(available);
  }

  function selectAssignGroup(g: Group) {
    setAssignGroupId(g.id);
    const allIdx = (g.schedules || []).map((_, i) => i);
    const m = assignMemberships[g.id];
    // Pre-select current enrollment for a partial member, else all sessions.
    setAssignSessions(m && m.enrolled ? m.enrolled : allIdx);
    setAssignError(null);
  }

  async function confirmAssign() {
    if (!assignStudent || !assignGroupId) return;
    const g = assignGroups.find((gr) => gr.id === assignGroupId);
    const allIdx = (g?.schedules || []).map((_, i) => i);
    if (allIdx.length > 0 && assignSessions.length === 0) {
      setAssignError("noSchedule");
      return;
    }
    const isAll =
      allIdx.length > 0 && allIdx.every((i) => assignSessions.includes(i)) && assignSessions.length === allIdx.length;
    setAssigning(true);
    setAssignError(null);

    const existing = assignMemberships[assignGroupId];
    const res = existing
      ? await fetch(`/api/groups/${assignGroupId}/members`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: existing.id, enrolled_sessions: isAll ? null : assignSessions }),
        })
      : await fetch(`/api/groups/${assignGroupId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_id: assignStudent.id, enrolled_sessions: isAll ? undefined : assignSessions }),
        });

    if (res.ok) {
      setAssignStudent(null);
      fetchStudents();
    } else {
      const data = await res.json().catch(() => ({}));
      setAssignError(
        data.error === "already_member" ? "alreadyMember" : data.error === "group_full" ? "groupFull" : "generic",
      );
    }
    setAssigning(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/students/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      const id = deleteTarget.id;
      setStudents((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (!search.trim()) setCache("students", next);
        return next;
      });
      setDeleteTarget(null);
    }
    setDeleting(false);
  }

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff]"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between px-5 pb-1 pt-10">
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">
          {t("title")}
        </h1>
        <button
          onPointerDown={() => setAddPressed(true)}
          onPointerUp={() => setAddPressed(false)}
          onPointerLeave={() => setAddPressed(false)}
          onClick={() => router.push(`/${locale}/students/add`)}
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

      {/* Search */}
      <motion.div variants={fadeUp} className="px-5 pt-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search")}
          className="h-11 w-full rounded-xl border-2 border-[#ddd6fe] bg-[#f9f7ff] px-3 text-[13px] font-semibold text-[#1e1b4b] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#1e1b4b]/30 focus:border-[#7c3aed] focus:shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
        />
      </motion.div>

      {isDirector && (
        <motion.div variants={fadeUp} className="px-5 pt-3">
          <TeacherFilter teachers={teachers} value={teacherFilter} onChange={setTeacherFilter} />
        </motion.div>
      )}

      <div
        className="flex-1 overflow-y-auto px-5 pt-4 pb-2 scrollbar-hide"
        onClick={() => { if (wiggleId) setWiggleId(null); }}
      >
        {loading ? (
          <motion.div variants={fadeUp}>
            <ListSkeleton count={4} />
          </motion.div>
        ) : students.length === 0 && !search ? (
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
                  d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                  stroke="#c4b5fd"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="7" r="4" stroke="#c4b5fd" strokeWidth="2.5" />
                <path
                  d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                  stroke="#c4b5fd"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
              onClick={() => router.push(`/${locale}/students/add`)}
              className="mt-5 rounded-xl px-5 py-3 text-[13px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms]"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                transform: `translateY(${createPressed ? 4 : 0}px)`,
                boxShadow: createPressed
                  ? "0 0px 0 #5b21b6, 0 2px 4px -2px rgba(124,58,237,0.4)"
                  : "0 4px 0 #5b21b6, 0 8px 20px -6px rgba(124,58,237,0.4)",
              }}
            >
              {t("addCta")}
            </button>
          </motion.div>
        ) : students.length === 0 && search ? (
          <motion.div variants={fadeUp} className="flex flex-col items-center pt-16">
            <p className="text-[13px] font-semibold text-[#1e1b4b]/40">
              {t("noResult", { search })}
            </p>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="flex flex-col gap-3">
            {visibleStudents.map((student) => (
              <div key={student.id} className="relative">
                <StudentCard
                  student={student}
                  onTap={() => router.push(`/${locale}/students/${student.id}`)}
                  onPrefetch={() => router.prefetch(`/${locale}/students/${student.id}`)}
                  wiggling={wiggleId === student.id}
                  onLongPress={() => setWiggleId(student.id)}
                />
                <AnimatePresence>
                  {wiggleId === student.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute -top-2 right-2 z-10 flex gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(student); }}
                        aria-label={t("editProfile")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                        style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", boxShadow: "0 2px 0 #5b21b6" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openAssign(student); }}
                        aria-label={t("assignToGroup")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                        style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 2px 0 #15803d" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="8.5" cy="7" r="4" />
                          <line x1="20" y1="8" x2="20" y2="14" />
                          <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setWiggleId(null); setDeleteTarget(student); }}
                        aria-label={t("deleteStudent")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                        style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 2px 0 #b91c1c" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
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

      {/* Account-student message */}
      <AnimatePresence>
        {accountMsg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-5"
            onClick={() => setAccountMsg(false)}
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
              <p className="text-[14px] font-extrabold text-[#1e1b4b]">{t("accountStudentTitle")}</p>
              <p className="mt-2 text-[12px] font-semibold text-[#1e1b4b]/50">{t("accountStudentMsg")}</p>
              <button
                onClick={() => setAccountMsg(false)}
                className="btn-push mt-4 w-full rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed]"
                style={{ "--push-shadow": "#ddd6fe", "--push-glow": "rgba(124,58,237,0.1)" } as React.CSSProperties}
              >
                {t("close")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit profile modal */}
      <AnimatePresence>
        {editStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30"
            onClick={() => setEditStudent(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-2xl bg-white px-5 pb-8 pt-5"
              style={{ boxShadow: "0 -8px 32px -8px rgba(30,27,75,0.15)", maxHeight: "85dvh" }}
            >
              <p className="mb-3 text-[15px] font-extrabold text-[#1e1b4b]">{t("editProfile")}</p>

              <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: "calc(85dvh - 140px)" }}>
                <FieldLabel>{t("fullName")}</FieldLabel>
                <InputField value={editName} onChange={setEditName} placeholder={t("fullNamePlaceholder")} />

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>{t("phone")}</FieldLabel>
                    <InputField value={editPhone} onChange={setEditPhone} placeholder={t("phonePlaceholder")} type="tel" />
                  </div>
                  <div>
                    <FieldLabel>{t("parentPhone")}</FieldLabel>
                    <InputField value={editParentPhone} onChange={setEditParentPhone} placeholder={t("parentPhonePlaceholder")} type="tel" />
                  </div>
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
                          <p className="mb-1.5 text-[11px] font-bold uppercase text-[#1e1b4b]/30">{catLabel}</p>
                          <ToggleGroup
                            options={catLevels.map((l) => ({ id: l.id, label: l.label }))}
                            value={catActive ? editLevel : ""}
                            onChange={(id) => { setEditLevel(id); setEditSection(""); }}
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
                      transition={{ duration: 0.3, ease }}
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

                <div className="mt-4">
                  <FieldLabel>{t("notes")}</FieldLabel>
                  <TextArea value={editNotes} onChange={setEditNotes} placeholder={t("notesPlaceholder")} />
                </div>

                {editError && (
                  <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                    {t("editError")}
                  </p>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setEditStudent(null)}
                  className="btn-push rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed]"
                  style={{ "--push-shadow": "#ddd6fe", "--push-glow": "rgba(124,58,237,0.1)" } as React.CSSProperties}
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit || !editName.trim() || !editLevel}
                  className="btn-push rounded-xl py-3 text-[13px] font-extrabold text-white disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                    "--push-shadow": "#5b21b6",
                    "--push-glow": "rgba(124,58,237,0.4)",
                  } as React.CSSProperties}
                >
                  {savingEdit ? t("saving") : t("save")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign to group sheet */}
      <AnimatePresence>
        {assignStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30"
            onClick={() => setAssignStudent(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-2xl bg-white px-5 pb-8 pt-5"
              style={{ boxShadow: "0 -8px 32px -8px rgba(30,27,75,0.15)", maxHeight: "70dvh" }}
            >
              {(() => {
                const selected = assignGroups.find((g) => g.id === assignGroupId);
                const schedules = selected?.schedules || [];
                return (
                  <>
                    <p className="mb-3 text-[15px] font-extrabold text-[#1e1b4b]">
                      {selected ? selected.name : t("assignToGroup")}
                    </p>

                    {assignError && (
                      <p className="mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-600">
                        {assignError === "alreadyMember"
                          ? t("alreadyMember")
                          : assignError === "groupFull"
                          ? t("groupFull")
                          : assignError === "noSchedule"
                          ? t("noSchedule")
                          : t("editError")}
                      </p>
                    )}

                    {!selected ? (
                      <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: "calc(70dvh - 120px)" }}>
                        {assignGroups.length === 0 ? (
                          <p className="py-6 text-center text-[12px] font-semibold text-[#1e1b4b]/40">
                            {t("noGroupsToAssign")}
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {assignGroups.map((g) => (
                              <button
                                key={g.id}
                                onClick={() => selectAssignGroup(g)}
                                className="btn-push flex items-center gap-3 rounded-xl bg-[#f9f7ff] px-3 py-2.5 text-left"
                                style={{ "--push-shadow": "#e9e5f5", "--push-glow": "rgba(124,58,237,0.1)", "--push-depth": "2px" } as React.CSSProperties}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-bold text-[#1e1b4b]">{g.name}</p>
                                  <p className="text-[10px] font-semibold text-[#1e1b4b]/40">
                                    {getLevelDef(g.level)?.label || g.level}
                                    {g.section ? ` - ${g.section}` : ""}
                                  </p>
                                </div>
                                <div
                                  className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-white"
                                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                                >
                                  +
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: "calc(70dvh - 180px)" }}>
                        {schedules.length > 0 ? (
                          <>
                            <p className="mb-2 text-[12px] font-bold text-[#1e1b4b]/50">{t("enrolledSessions")}</p>
                            <div className="flex flex-wrap gap-2">
                              {schedules.map((s, sIdx) => {
                                const on = assignSessions.includes(sIdx);
                                return (
                                  <button
                                    key={sIdx}
                                    onClick={() =>
                                      setAssignSessions(
                                        on ? assignSessions.filter((i) => i !== sIdx) : [...assignSessions, sIdx],
                                      )
                                    }
                                    className="rounded-xl px-3 py-2 text-[11px] font-extrabold transition-[transform,box-shadow] duration-[80ms]"
                                    style={{
                                      background: on
                                        ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                                        : "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                                      color: on ? "#fff" : "#7c3aed",
                                      transform: `translateY(${on ? 3 : 0}px)`,
                                      boxShadow: on
                                        ? "0 0px 0 #5b21b6, 0 1px 3px -1px rgba(124,58,237,0.5)"
                                        : "0 3px 0 #ddd6fe, 0 6px 12px -4px rgba(124,58,237,0.15)",
                                    }}
                                  >
                                    {tGroups(`day${s.day}Short`)} {s.start_time}-{s.end_time}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <p className="py-4 text-center text-[12px] font-semibold text-[#1e1b4b]/40">
                            {t("noSessionsInGroup")}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => (selected ? setAssignGroupId(null) : setAssignStudent(null))}
                        className="btn-push rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed]"
                        style={{ "--push-shadow": "#ddd6fe", "--push-glow": "rgba(124,58,237,0.1)" } as React.CSSProperties}
                      >
                        {selected ? t("back") : t("cancel")}
                      </button>
                      {selected && (
                        <button
                          onClick={confirmAssign}
                          disabled={assigning}
                          className="btn-push rounded-xl py-3 text-[13px] font-extrabold text-white disabled:opacity-60"
                          style={{
                            background: "linear-gradient(135deg, #22c55e, #16a34a)",
                            "--push-shadow": "#15803d",
                            "--push-glow": "rgba(34,197,94,0.4)",
                          } as React.CSSProperties}
                        >
                          {assigning ? t("saving") : t("assignToGroup")}
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-5"
            onClick={() => setDeleteTarget(null)}
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
              <p className="text-[14px] font-extrabold text-[#1e1b4b]">{t("deleteStudent")}</p>
              <p className="mt-2 text-[12px] font-semibold text-[#1e1b4b]/50">
                {t("deleteStudentConfirm", { name: deleteTarget.full_name })}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="btn-push rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed]"
                  style={{ "--push-shadow": "#ddd6fe", "--push-glow": "rgba(124,58,237,0.1)" } as React.CSSProperties}
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={confirmDelete}
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

    </motion.main>
  );
}
