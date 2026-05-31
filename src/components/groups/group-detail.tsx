"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { getLevelDef } from "@/lib/levels";
import type { Group, GroupMember, JoinRequest } from "@/types/groups";
import type { Student } from "@/types/students";
import { BottomNav } from "@/components/dashboard/bottom-nav";

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

function QrCode({ value }: { value: string }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(value, {
        width: 180,
        margin: 2,
        color: { dark: "#1e1b4b", light: "#ffffff" },
      }).then(setSrc);
    });
  }, [value]);

  if (!src) return <div className="h-[180px] w-[180px] rounded-xl bg-[#f9f7ff]" />;
  return <img src={src} alt="QR Code" className="h-[180px] w-[180px] rounded-xl" />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[12px] font-bold uppercase text-[#1e1b4b]/30">
      {children}
    </p>
  );
}

export function GroupDetail({
  group,
  members: initialMembers,
  requests: initialRequests,
}: {
  group: Group;
  members: GroupMember[];
  requests: JoinRequest[];
}) {
  const t = useTranslations("groups");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [members, setMembers] = useState(initialMembers);
  const [requests, setRequests] = useState(initialRequests);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [addingStudentId, setAddingStudentId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const levelDef = getLevelDef(group.level);

  const tStudents = useTranslations("students");
  const tJoin = useTranslations("join");

  // Poll for new join requests every 5 seconds
  const requestsRef = useRef(requests);
  requestsRef.current = requests;

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/groups/${group.id}/requests`);
      if (!res.ok) return;
      const fresh: JoinRequest[] = await res.json();
      const currentIds = new Set(requestsRef.current.map((r) => r.id));
      const freshIds = new Set(fresh.map((r) => r.id));
      const hasChanges =
        fresh.length !== requestsRef.current.length ||
        fresh.some((r) => !currentIds.has(r.id)) ||
        requestsRef.current.some((r) => !freshIds.has(r.id));
      if (hasChanges) {
        setRequests(fresh);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [group.id]);

  const fetchAvailableStudents = useCallback(async () => {
    const params = new URLSearchParams();
    if (studentSearch.trim()) params.set("search", studentSearch.trim());
    const res = await fetch(`/api/students?${params}`);
    if (res.ok) {
      const all: Student[] = await res.json();
      const memberIds = new Set(members.map((m) => m.student_id));
      setAvailableStudents(all.filter((s) => !memberIds.has(s.id)));
    }
  }, [studentSearch, members]);

  useEffect(() => {
    if (!showAddStudent) return;
    const timer = setTimeout(fetchAvailableStudents, studentSearch ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchAvailableStudents, showAddStudent, studentSearch]);

  async function handleAddStudent(studentId: string) {
    setAddingStudentId(studentId);
    setAddError(null);
    const res = await fetch(`/api/groups/${group.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId }),
    });
    if (res.ok) {
      const newMember = await res.json();
      setMembers((prev) => [...prev, newMember]);
      setAvailableStudents((prev) => prev.filter((s) => s.id !== studentId));
      setAddingStudentId(null);
    } else {
      const data = await res.json();
      setAddError(data.error === "already_member" ? "alreadyMember" : data.error === "group_full" ? "groupFull" : "generic");
      setAddingStudentId(null);
    }
  }

  async function confirmRemoveMember() {
    if (!removeMemberId) return;
    setRemoving(true);
    const res = await fetch(
      `/api/groups/${group.id}/members?memberId=${removeMemberId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== removeMemberId));
    }
    setRemoving(false);
    setRemoveMemberId(null);
  }

  async function handleRequest(requestId: string, action: "accept" | "reject") {
    const res = await fetch(`/api/groups/${group.id}/requests`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (action === "accept") {
        router.refresh();
      }
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push(`/${locale}/groups`);
      router.refresh();
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
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 px-5 pb-1 pt-10">
        <button
          onClick={() => router.push(`/${locale}/groups`)}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-[transform,box-shadow] duration-[80ms] active:translate-y-[2px]"
          style={{
            background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
            boxShadow: "0 3px 0 #e9e5f5",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-extrabold text-[#1e1b4b]">
            {group.name}
          </h1>
          <p className="text-[12px] font-semibold text-[#1e1b4b]/40">
            {levelDef?.label || group.level}
            {group.section ? ` - ${group.section}` : ""}
          </p>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 scrollbar-hide">
        {/* Info badges */}
        <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
          <span className="rounded-xl bg-white px-3 py-1.5 text-[12px] font-bold text-[#7c3aed]" style={{ boxShadow: "0 2px 0 #e9e5f5" }}>
            {group.price} DA
          </span>
          <span className="rounded-xl bg-white px-3 py-1.5 text-[12px] font-bold text-[#22c55e]" style={{ boxShadow: "0 2px 0 #e9e5f5" }}>
            {t(paymentModeKeys[group.payment_mode] || "monthly")}
          </span>
          <span className="rounded-xl bg-white px-3 py-1.5 text-[12px] font-bold text-[#f97316]" style={{ boxShadow: "0 2px 0 #e9e5f5" }}>
            {members.length} {t("capacity", { max: group.capacity })}
          </span>
        </motion.div>

        {/* Join code + QR */}
        <motion.div variants={fadeUp} className="mt-4">
          <SectionTitle>{tJoin("shareCode")}</SectionTitle>
          <div
            className="rounded-xl bg-white p-4"
            style={{ boxShadow: "0 2px 0 #e9e5f5" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-mono text-[24px] font-black tracking-[0.2em] text-[#7c3aed]">
                  {group.join_code}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#1e1b4b]/40">
                  {tJoin("orEnterCode")}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(group.join_code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="rounded-xl px-3 py-2 text-[11px] font-bold transition-[transform,box-shadow] duration-[80ms] active:translate-y-[1px]"
                style={{
                  background: copied ? "linear-gradient(135deg, #22c55e, #16a34a)" : "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                  color: copied ? "#fff" : "#7c3aed",
                  boxShadow: copied ? "0 2px 0 #15803d" : "0 2px 0 #e9e5f5",
                }}
              >
                {copied ? tJoin("copied") : tJoin("share")}
              </button>
            </div>
            <div className="mt-3 flex justify-center">
              <QrCode value={`${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/join?code=${group.join_code}`} />
            </div>
          </div>
        </motion.div>

        {/* Members */}
        <motion.div variants={fadeUp} className="mt-5">
          <SectionTitle>
            {t("members")} ({members.length})
          </SectionTitle>
          {members.length === 0 ? (
            <div className="rounded-xl bg-white p-4 text-center" style={{ boxShadow: "0 2px 0 #e9e5f5" }}>
              <p className="text-[12px] font-semibold text-[#1e1b4b]/40">
                {t("noMembers")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl bg-white px-4 py-3"
                  style={{ boxShadow: "0 2px 0 #e9e5f5" }}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                  >
                    {(m.student?.full_name || m.student_id)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-[#1e1b4b]">
                      {m.student?.full_name || m.student_id.slice(0, 8)}
                    </p>
                  </div>
                  <button
                    onClick={() => setRemoveMemberId(m.id)}
                    className="rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-500 transition-[transform] duration-[80ms] active:translate-y-[1px]"
                  >
                    {t("removeStudent")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Add student button */}
        <motion.div variants={fadeUp} className="mt-3">
          <button
            onClick={() => router.push(`/${locale}/students/add?group=${group.id}`)}
            className="w-full rounded-xl py-2.5 text-[12px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms] active:translate-y-[2px]"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              boxShadow: "0 3px 0 #5b21b6, 0 6px 12px -4px rgba(124,58,237,0.4)",
            }}
          >
            {tStudents("addNew")}
          </button>
        </motion.div>

        {/* Requests */}
        <motion.div variants={fadeUp} className="mt-5">
          <SectionTitle>
            {t("requests")} ({requests.length})
          </SectionTitle>
          {requests.length === 0 ? (
            <div className="rounded-xl bg-white p-4 text-center" style={{ boxShadow: "0 2px 0 #e9e5f5" }}>
              <p className="text-[12px] font-semibold text-[#1e1b4b]/40">
                {t("noRequests")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl bg-white px-4 py-3"
                  style={{ boxShadow: "0 2px 0 #e9e5f5" }}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white"
                    style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
                  >
                    {(r.student_name || r.student_email || r.student_id)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-[#1e1b4b]">
                      {r.student_name || r.student_email || r.student_id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleRequest(r.id, "accept")}
                      className="rounded-lg bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-600 transition-[transform] duration-[80ms] active:translate-y-[1px]"
                    >
                      {t("accept")}
                    </button>
                    <button
                      onClick={() => handleRequest(r.id, "reject")}
                      className="rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-500 transition-[transform] duration-[80ms] active:translate-y-[1px]"
                    >
                      {t("reject")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Delete */}
        <motion.div variants={fadeUp} className="mt-8">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full rounded-xl bg-white py-3 text-[13px] font-extrabold text-red-400 transition-[transform,box-shadow] duration-[80ms] active:translate-y-[2px]"
            style={{ boxShadow: "0 3px 0 #fecaca" }}
          >
            {t("deleteGroup")}
          </button>
        </motion.div>
      </div>

      {/* Add student overlay */}
      <AnimatePresence>
        {showAddStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
            onClick={() => { setShowAddStudent(false); setStudentSearch(""); setAddError(null); }}
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
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[15px] font-extrabold text-[#1e1b4b]">
                  {tStudents("addToGroup")}
                </p>
                <button
                  onClick={() => { setShowAddStudent(false); setStudentSearch(""); setAddError(null); }}
                  className="rounded-lg bg-[#f0ecff] px-2.5 py-1 text-[11px] font-bold text-[#7c3aed]"
                >
                  {t("cancel")}
                </button>
              </div>

              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder={tStudents("search")}
                className="mb-3 h-10 w-full rounded-xl border-2 border-[#ddd6fe] bg-[#f9f7ff] px-3 text-[13px] font-semibold text-[#1e1b4b] outline-none placeholder:text-[#1e1b4b]/30 focus:border-[#7c3aed]"
              />

              {addError && (
                <p className="mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-600">
                  {addError === "alreadyMember" ? tStudents("alreadyMember") : addError === "groupFull" ? tStudents("groupFull") : "Erreur"}
                </p>
              )}

              <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: "calc(70dvh - 160px)" }}>
                {availableStudents.length === 0 ? (
                  <p className="py-6 text-center text-[12px] font-semibold text-[#1e1b4b]/40">
                    {tStudents("empty")}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {availableStudents.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleAddStudent(s.id)}
                        disabled={addingStudentId === s.id}
                        className="flex items-center gap-3 rounded-xl bg-[#f9f7ff] px-3 py-2.5 text-left transition-[transform] duration-[80ms] active:translate-y-[1px] disabled:opacity-50"
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-black text-white"
                          style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                        >
                          {s.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold text-[#1e1b4b]">
                            {s.full_name}
                          </p>
                          <p className="text-[10px] font-semibold text-[#1e1b4b]/40">
                            {getLevelDef(s.level)?.label || s.level}
                            {s.section ? ` - ${s.section}` : ""}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove member confirmation overlay */}
      <AnimatePresence>
        {removeMemberId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-5"
            onClick={() => setRemoveMemberId(null)}
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
                {t("removeStudent")}
              </p>
              <p className="mt-2 text-[12px] font-semibold text-[#1e1b4b]/50">
                {t("removeConfirm")}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRemoveMemberId(null)}
                  className="rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed] transition-[transform] duration-[80ms] active:translate-y-[2px]"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={confirmRemoveMember}
                  disabled={removing}
                  className="rounded-xl py-3 text-[13px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms] disabled:opacity-60 active:translate-y-[2px]"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    boxShadow: "0 3px 0 #b91c1c",
                  }}
                >
                  {t("confirm")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-5"
            onClick={() => setShowDeleteConfirm(false)}
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
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed] transition-[transform] duration-[80ms] active:translate-y-[2px]"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-xl py-3 text-[13px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms] disabled:opacity-60 active:translate-y-[2px]"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    boxShadow: "0 3px 0 #b91c1c",
                  }}
                >
                  {t("confirm")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="h-24 shrink-0" />
      <BottomNav active="groups" />
    </motion.main>
  );
}
