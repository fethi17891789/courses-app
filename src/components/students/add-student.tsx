"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { levels, hasSections, getLevelDef, categoryLabels, type LevelCategory } from "@/lib/levels";
import type { Group } from "@/types/groups";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.06 } },
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

type GroupAssignment = {
  group_id: string;
  enrolled_sessions: number[];
  locked: boolean;
};

export function AddStudent({ preselectedGroupId }: { preselectedGroupId?: string }) {
  const t = useTranslations("students");
  const tGroups = useTranslations("groups");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [notes, setNotes] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupAssignments, setGroupAssignments] = useState<GroupAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitPressed, setSubmitPressed] = useState(false);
  const [backPressed, setBackPressed] = useState(false);

  const levelDef = selectedLevel ? getLevelDef(selectedLevel) : null;
  const showSections = selectedLevel ? hasSections(selectedLevel) : false;
  const categories: LevelCategory[] = ["primaire", "moyen", "lycee"];

  useEffect(() => {
    fetch("/api/groups")
      .then((res) => res.json())
      .then((data: Group[]) => {
        setGroups(data);
        if (preselectedGroupId) {
          const g = data.find((gr: Group) => gr.id === preselectedGroupId);
          if (g) {
            setGroupAssignments([{
              group_id: g.id,
              enrolled_sessions: g.schedules?.map((_, i) => i) || [],
              locked: true,
            }]);
          }
        }
      })
      .catch(() => {});
  }, [preselectedGroupId]);

  function addGroupAssignment() {
    const usedIds = new Set(groupAssignments.map((ga) => ga.group_id));
    const available = groups.find((g) => !usedIds.has(g.id));
    if (!available) return;
    setGroupAssignments([...groupAssignments, {
      group_id: available.id,
      enrolled_sessions: available.schedules?.map((_, i) => i) || [],
      locked: false,
    }]);
  }

  function removeGroupAssignment(index: number) {
    setGroupAssignments(groupAssignments.filter((_, i) => i !== index));
  }

  function updateGroupId(index: number, newGroupId: string) {
    const g = groups.find((gr) => gr.id === newGroupId);
    setGroupAssignments(groupAssignments.map((ga, i) =>
      i === index
        ? { ...ga, group_id: newGroupId, enrolled_sessions: g?.schedules?.map((_, idx) => idx) || [] }
        : ga
    ));
  }

  function toggleSession(index: number, sessionIdx: number) {
    setGroupAssignments(groupAssignments.map((ga, i) => {
      if (i !== index) return ga;
      const has = ga.enrolled_sessions.includes(sessionIdx);
      return {
        ...ga,
        enrolled_sessions: has
          ? ga.enrolled_sessions.filter((d) => d !== sessionIdx)
          : [...ga.enrolled_sessions, sessionIdx],
      };
    }));
  }

  async function handleCreate() {
    if (!fullName.trim() || !selectedLevel) {
      setError("missing_fields");
      return;
    }

    const emptySchedule = groupAssignments.some((ga) => {
      const g = groups.find((gr) => gr.id === ga.group_id);
      return (g?.schedules?.length || 0) > 0 && ga.enrolled_sessions.length === 0;
    });
    if (emptySchedule) {
      setError("no_schedule");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const groupsPayload = groupAssignments.map((ga) => {
        const g = groups.find((gr) => gr.id === ga.group_id);
        const allIdx = g?.schedules?.map((_, i) => i) || [];
        const isAll = allIdx.length > 0 && allIdx.every((i) => ga.enrolled_sessions.includes(i)) && ga.enrolled_sessions.length === allIdx.length;
        return {
          group_id: ga.group_id,
          enrolled_sessions: isAll ? null : ga.enrolled_sessions,
        };
      });

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          parent_phone: parentPhone.trim() || null,
          level: selectedLevel,
          section: showSections ? selectedSection || null : null,
          notes: notes.trim() || null,
          groups: groupsPayload.length > 0 ? groupsPayload : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error === "student_limit_reached" ? "student_limit_reached" : "generic");
        return;
      }

      if (preselectedGroupId) {
        router.back();
      } else {
        router.push(`/${locale}/students`);
      }
      router.refresh();
    } catch {
      setError("generic");
    } finally {
      setLoading(false);
    }
  }

  const usedGroupIds = new Set(groupAssignments.map((ga) => ga.group_id));
  const canAddGroup = groups.some((g) => !usedGroupIds.has(g.id));

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff]"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 px-5 pb-1 pt-10">
        <button
          onClick={() => router.back()}
          className="btn-push flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
            "--push-shadow": "#5b21b6",
            "--push-glow": "rgba(124,58,237,0.4)",
          } as React.CSSProperties}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">
          {t("addCta")}
        </h1>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 scrollbar-hide">
        {/* Full name */}
        <motion.div variants={fadeUp}>
          <FieldLabel>{t("fullName")}</FieldLabel>
          <InputField
            value={fullName}
            onChange={setFullName}
            placeholder={t("fullNamePlaceholder")}
          />
        </motion.div>

        {/* Phones */}
        <motion.div variants={fadeUp} className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>{t("phone")}</FieldLabel>
            <InputField
              value={phone}
              onChange={setPhone}
              placeholder={t("phonePlaceholder")}
              type="tel"
            />
          </div>
          <div>
            <FieldLabel>{t("parentPhone")}</FieldLabel>
            <InputField
              value={parentPhone}
              onChange={setParentPhone}
              placeholder={t("parentPhonePlaceholder")}
              type="tel"
            />
          </div>
        </motion.div>

        {/* Level picker */}
        <motion.div variants={fadeUp} className="mt-4">
          <FieldLabel>{t("level")}</FieldLabel>
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
        </motion.div>

        {/* Sections (if lycee) */}
        <AnimatePresence initial={false}>
          {showSections && levelDef?.sections && (
            <motion.div
              key={selectedLevel}
              className="mt-4 overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <FieldLabel>{t("section")}</FieldLabel>
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

        {/* Group assignments */}
        {groups.length > 0 && (
          <motion.div variants={fadeUp} className="mt-4">
            <FieldLabel>{t("groups")}</FieldLabel>
            <div className="flex flex-col gap-3">
              {groupAssignments.map((ga, index) => {
                const g = groups.find((gr) => gr.id === ga.group_id);
                const schedules = g?.schedules || [];
                const availableGroups = groups.filter(
                  (gr) => gr.id === ga.group_id || !usedGroupIds.has(gr.id)
                );
                return (
                  <div
                    key={index}
                    className="rounded-xl bg-white p-3"
                    style={{ boxShadow: "0 2px 0 #e9e5f5" }}
                  >
                    <div className="flex items-center gap-2">
                      {ga.locked ? (
                        <div className="flex-1 rounded-xl border-2 border-[#e9e5f5] bg-[#f0ecff] px-3 py-2.5 text-[12px] font-extrabold text-[#1e1b4b]/60">
                          {g?.name || ""}
                        </div>
                      ) : (
                        <select
                          value={ga.group_id}
                          onChange={(e) => updateGroupId(index, e.target.value)}
                          className="flex-1 rounded-xl border-2 border-[#ddd6fe] bg-[#f9f7ff] px-3 py-2.5 text-[12px] font-extrabold text-[#1e1b4b] outline-none focus:border-[#7c3aed]"
                        >
                          {availableGroups.map((gr) => (
                            <option key={gr.id} value={gr.id}>
                              {gr.name} - {getLevelDef(gr.level)?.label || gr.level}
                            </option>
                          ))}
                        </select>
                      )}
                      {!ga.locked && (
                        <button
                          onClick={() => removeGroupAssignment(index)}
                          className="btn-push shrink-0 rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-500"
                          style={{ "--push-shadow": "#fecaca", "--push-glow": "rgba(239,68,68,0.15)", "--push-depth": "2px" } as React.CSSProperties}
                        >
                          {t("removeGroup")}
                        </button>
                      )}
                    </div>
                    {schedules.length > 1 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {schedules.map((s, sIdx) => {
                          const selected = ga.enrolled_sessions.includes(sIdx);
                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => toggleSession(index, sIdx)}
                              className="rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold transition-[transform,box-shadow] duration-[80ms]"
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
                              {tGroups(`day${s.day}Short`)} {s.start_time}-{s.end_time}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {canAddGroup && (
                <button
                  onClick={addGroupAssignment}
                  className="btn-push w-full rounded-xl border-2 border-dashed border-[#ddd6fe] py-2.5 text-[12px] font-extrabold text-[#7c3aed]"
                  style={{ "--push-shadow": "#e9e5f5", "--push-glow": "rgba(124,58,237,0.1)", "--push-depth": "2px" } as React.CSSProperties}
                >
                  + {t("addGroup")}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Notes */}
        <motion.div variants={fadeUp} className="mt-4">
          <FieldLabel>{t("notes")}</FieldLabel>
          <TextArea
            value={notes}
            onChange={setNotes}
            placeholder={t("notesPlaceholder")}
          />
        </motion.div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600"
          >
            {error === "missing_fields"
              ? "Veuillez remplir le nom et le niveau."
              : error === "no_schedule"
                ? "Veuillez selectionner au moins une seance par groupe."
                : error === "student_limit_reached"
                  ? "Limite de 45 eleves atteinte. Passez au plan Pro pour ajouter plus d'eleves."
                  : "Une erreur est survenue."}
          </motion.p>
        )}

        {/* Submit */}
        <motion.div variants={fadeUp} className="mt-5">
          <button
            onPointerDown={() => setSubmitPressed(true)}
            onPointerUp={() => setSubmitPressed(false)}
            onPointerLeave={() => setSubmitPressed(false)}
            onClick={handleCreate}
            disabled={loading}
            className="w-full rounded-xl py-3.5 text-[14px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              transform: `translateY(${submitPressed && !loading ? 4 : 0}px)`,
              boxShadow: submitPressed && !loading
                ? "0 0px 0 #5b21b6, 0 2px 4px -2px rgba(124,58,237,0.4)"
                : "0 4px 0 #5b21b6, 0 8px 20px -6px rgba(124,58,237,0.4)",
            }}
          >
            {loading ? t("creating") : t("create")}
          </button>
        </motion.div>
      </div>
      <div className="h-24 shrink-0" />
    </motion.main>
  );
}
