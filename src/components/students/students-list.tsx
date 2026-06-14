"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getCache, setCache } from "@/lib/page-cache";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { getLevelDef } from "@/lib/levels";
import { ListSkeleton } from "@/components/ui/skeleton";
import type { Student } from "@/types/students";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

function StudentCard({
  student,
  onTap,
}: {
  student: Student;
  onTap: () => void;
}) {
  const t = useTranslations("students");
  const levelDef = getLevelDef(student.level);
  const label = levelDef?.label || student.level;

  return (
    <button
      onClick={onTap}
      className="btn-push w-full rounded-xl bg-white p-4 text-left"
      style={{
        "--push-shadow": "#e9e5f5",
        "--push-glow": "rgba(30,27,75,0.08)",
      } as React.CSSProperties}
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
    </button>
  );
}

export function StudentsList() {
  const t = useTranslations("students");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [students, setStudents] = useState<Student[]>(() => getCache<Student[]>("students") ?? []);
  const [loading, setLoading] = useState(() => getCache<Student[]>("students") === null);
  const [search, setSearch] = useState("");
  const [addPressed, setAddPressed] = useState(false);
  const [createPressed, setCreatePressed] = useState(false);

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

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 scrollbar-hide">
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
              Aucun resultat pour "{search}"
            </p>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="flex flex-col gap-3">
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                onTap={() => router.push(`/${locale}/students/${student.id}`)}
              />
            ))}
          </motion.div>
        )}
        <div className="h-28" />
      </div>

      <BottomNav active="students" />
    </motion.main>
  );
}
