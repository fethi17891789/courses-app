"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export type SchoolTeacher = { id: string; name: string; is_self: boolean };

// Cache mémoire partagé : la liste des profs change rarement, on ne rappelle
// donc pas /api/school a chaque navigation. Une seule requete par session, et
// les requetes concurrentes sont dedupliquees (inflight).
let cachedTeachers: SchoolTeacher[] | null = null;
let inflight: Promise<SchoolTeacher[]> | null = null;

async function loadTeachers(): Promise<SchoolTeacher[]> {
  if (cachedTeachers) return cachedTeachers;
  if (!inflight) {
    inflight = fetch("/api/school")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list: SchoolTeacher[] =
          d?.is_director && Array.isArray(d.teachers) ? d.teachers : [];
        cachedTeachers = list;
        return list;
      })
      .catch(() => [] as SchoolTeacher[])
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

// Charge la liste des profs de l'ecole (directeur uniquement). Pour un prof
// normal, l'API renvoie is_director = false -> teachers reste vide et rien ne
// s'affiche cote UI. Purement additif.
export function useSchoolTeachers() {
  const [teachers, setTeachers] = useState<SchoolTeacher[]>(cachedTeachers ?? []);

  useEffect(() => {
    let alive = true;
    loadTeachers().then((list) => {
      if (alive) setTeachers(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  return teachers;
}

// Petit badge indiquant le prof proprietaire d'une carte (vue directeur).
export function TeacherBadge({ name, self }: { name: string; self?: boolean }) {
  const t = useTranslations("director");
  return (
    <span className="shrink-0 rounded-lg bg-[#f0ecff] px-2 py-0.5 text-[10px] font-bold text-[#7c3aed]">
      {self ? t("me") : name}
    </span>
  );
}

// Rangee de pilules "Tous + un par prof" pour filtrer la liste par enseignant.
// Reprend le style poussoir/pilule deja present (jours de seance, toggles).
export function TeacherFilter({
  teachers,
  value,
  onChange,
}: {
  teachers: SchoolTeacher[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const t = useTranslations("director");
  if (teachers.length <= 1) return null;

  const pills: { id: string | null; label: string }[] = [
    { id: null, label: t("allTeachers") },
    ...teachers.map((tc) => ({ id: tc.id, label: tc.is_self ? t("me") : tc.name })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {pills.map((p) => {
        const active = value === p.id;
        return (
          <button
            key={p.id ?? "all"}
            onClick={() => onChange(p.id)}
            className="shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-extrabold transition-[transform,box-shadow] duration-[80ms]"
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
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
