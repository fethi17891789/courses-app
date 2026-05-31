"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { getLevelDef } from "@/lib/levels";
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

const paymentModeKeys: Record<string, string> = {
  monthly: "monthly",
  per_session: "perSession",
  weekly: "weekly",
};

function GroupCard({
  group,
  onTap,
}: {
  group: Group;
  onTap: () => void;
}) {
  const t = useTranslations("groups");
  const levelDef = getLevelDef(group.level);
  const label = levelDef?.label || group.level;
  const section = group.section;

  return (
    <button
      onClick={onTap}
      className="w-full rounded-xl bg-white p-4 text-left transition-[transform,box-shadow] duration-[80ms] active:translate-y-[3px]"
      style={{
        boxShadow: "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)",
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
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7c3aed"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <span className="text-[12px] font-bold text-[#7c3aed]">
            {group.member_count ?? 0}
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
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
    </button>
  );
}

export function GroupsList({ groups }: { groups: Group[] }) {
  const t = useTranslations("groups");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const [addPressed, setAddPressed] = useState(false);
  const [createPressed, setCreatePressed] = useState(false);

  return (
    <motion.main
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff] font-[family-name:var(--font-sans)]"
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
              <GroupCard
                key={group.id}
                group={group}
                onTap={() => router.push(`/${locale}/groups/${group.id}`)}
              />
            ))}
          </motion.div>
        )}
        <div className="h-28" />
      </div>

      <BottomNav active="groups" />
    </motion.main>
  );
}
