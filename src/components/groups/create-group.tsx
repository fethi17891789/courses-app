"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { levels, hasSections, getLevelDef, categoryLabels, type LevelCategory } from "@/lib/levels";
import type { PaymentMode } from "@/types/groups";

const ease = [0.23, 1, 0.32, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
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


export function CreateGroup() {
  const t = useTranslations("groups");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];

  const [name, setName] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [capacity, setCapacity] = useState("30");
  const [price, setPrice] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitPressed, setSubmitPressed] = useState(false);
  const [backPressed, setBackPressed] = useState(false);

  const levelDef = selectedLevel ? getLevelDef(selectedLevel) : null;
  const showSections = selectedLevel ? hasSections(selectedLevel) : false;

  const categories: LevelCategory[] = ["primaire", "moyen", "lycee"];

  async function handleCreate() {
    if (!name.trim() || !selectedLevel) {
      setError("missing_fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          level: selectedLevel,
          section: showSections ? selectedSection || null : null,
          capacity: parseInt(capacity) || 30,
          price: parseInt(price) || 0,
          payment_mode: paymentMode,
        }),
      });

      if (!res.ok) {
        setError("generic");
        return;
      }

      router.push(`/${locale}/groups`);
      router.refresh();
    } catch {
      setError("generic");
    } finally {
      setLoading(false);
    }
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
          onPointerDown={() => setBackPressed(true)}
          onPointerUp={() => setBackPressed(false)}
          onPointerLeave={() => setBackPressed(false)}
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-[transform,box-shadow] duration-[80ms]"
          style={{
            background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
            transform: `translateY(${backPressed ? 2 : 0}px)`,
            boxShadow: backPressed
              ? "0 0px 0 #e9e5f5"
              : "0 3px 0 #e9e5f5",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">
          {t("createCta")}
        </h1>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6 scrollbar-hide">
        {/* Name */}
        <motion.div variants={fadeUp}>
          <FieldLabel>{t("name")}</FieldLabel>
          <InputField
            value={name}
            onChange={setName}
            placeholder={t("namePlaceholder")}
          />
        </motion.div>

        {/* Level picker - toggle per category */}
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

        {/* Capacity + Price */}
        <motion.div variants={fadeUp} className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>{t("capacityLabel")}</FieldLabel>
            <InputField
              value={capacity}
              onChange={setCapacity}
              type="number"
            />
          </div>
          <div>
            <FieldLabel>{t("price")} ({t("priceUnit")})</FieldLabel>
            <InputField
              value={price}
              onChange={setPrice}
              placeholder="0"
              type="number"
            />
          </div>
        </motion.div>

        {/* Payment mode - toggle style like login/signup */}
        <motion.div variants={fadeUp} className="mt-4">
          <FieldLabel>{t("paymentMode")}</FieldLabel>
          <ToggleGroup
            options={paymentModes.map((pm) => ({ id: pm.id, label: t(pm.key) }))}
            value={paymentMode}
            onChange={(id) => setPaymentMode(id as PaymentMode)}
            color="#f97316"
            shadow="#c2410c"
            glow="rgba(249,115,22,0.5)"
            gradientFrom="#fb923c"
            gradientTo="#ea580c"
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
    </motion.main>
  );
}
