"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { getLevelDef } from "@/lib/levels";
import type { Group, GroupMember, JoinRequest } from "@/types/groups";

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

  const levelDef = getLevelDef(group.level);

  async function handleRemoveMember(memberId: string) {
    const res = await fetch(
      `/api/groups/${group.id}/members?memberId=${memberId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
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
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff] font-[family-name:var(--font-sans)]"
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
                    {(m.student_name || m.student_email || m.student_id)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-[#1e1b4b]">
                      {m.student_name || m.student_email || m.student_id.slice(0, 8)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-500 transition-[transform] duration-[80ms] active:translate-y-[1px]"
                  >
                    {t("removeStudent")}
                  </button>
                </div>
              ))}
            </div>
          )}
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

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-5 pb-8"
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
    </motion.main>
  );
}
