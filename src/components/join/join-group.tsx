"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLevelDef } from "@/lib/levels";

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

export function JoinGroup({ initialCode }: { initialCode?: string }) {
  const t = useTranslations("join");
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

  async function handleLookup() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLookingUp(true);
    setNotFound(false);
    setGroupInfo(null);
    setError(null);
    setSent(false);

    const res = await fetch(`/api/join/${trimmed}`);
    if (res.ok) {
      const data = await res.json();
      setGroupInfo(data);
      if (data.existing_request?.status === "pending") {
        setError("requestPending");
      } else if (data.existing_request?.status === "accepted") {
        setError("requestAccepted");
      }
    } else {
      setNotFound(true);
    }
    setLookingUp(false);
  }

  async function handleSendRequest() {
    if (!groupInfo) return;

    setSending(true);
    setError(null);

    const res = await fetch(`/api/join/${code.trim().toUpperCase()}`, {
      method: "POST",
    });

    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json();
      if (data.error === "already_requested") setError("alreadyRequested");
      else if (data.error === "group_full") setError("groupFull");
      else if (data.error === "own_group") setError("ownGroup");
      else setError("generic");
    }
    setSending(false);
  }

  const levelDef = groupInfo ? getLevelDef(groupInfo.level) : null;

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
          <span className="mb-1.5 block text-[12px] font-bold text-[#1e1b4b]/50">
            {t("enterCode")}
          </span>
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
                {levelDef?.label || groupInfo.level}
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
              {error && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700">
                  {t(error as "requestPending" | "requestAccepted" | "requestRejected" | "alreadyRequested" | "ownGroup" | "groupFull")}
                </p>
              )}

              {/* Success */}
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

              {/* Send request button */}
              {!sent && !error && (
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
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
