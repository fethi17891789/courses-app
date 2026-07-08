"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  DEFAULT_PRICES,
  DUREES,
  PLAN_LABELS,
  type Plan,
  type Duree,
} from "@/lib/admin-pricing";

const ease = [0.23, 1, 0.32, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

const CARD_SHADOW = "0 3px 0 #e9e5f5, 0 6px 16px -4px rgba(30,27,75,0.08)";

function fmtDA(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR")} DA`;
}
function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// --- Types ------------------------------------------------------------------
type Stats = {
  sales: {
    activeTotal: number;
    activePro: number;
    activeStarter: number;
    newActivationsMonth: number;
    expiringSoon: number;
    churn: number;
    unusedCount: number;
    unusedValue: number;
  };
  revenue: { caMonth: number; caTotal: number; mrr: number };
  users: { profs: number; eleves: number; parents: number; newProfs7d: number; newProfs30d: number };
  activity: { groups: number; students: number; referralsTotal: number; referralsMonth: number };
};

type KeyItem = {
  id: string;
  plan: string;
  duration_days: number;
  price_da: number | null;
  is_test: boolean;
  used: boolean;
  expired: boolean;
  created_at: string;
  expires_at: string | null;
};

type Feedback = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  type: "bug" | "idea";
  message: string;
  status: string;
  created_at: string;
};

type Tab = "stats" | "cles" | "feedback" | "support";

// --- Petit composant KPI ----------------------------------------------------
function Kpi({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white px-3 py-3" style={{ boxShadow: `0 3px 0 ${color}20, 0 6px 16px -4px ${color}12` }}>
      <span className="text-[18px] font-extrabold leading-none" style={{ color }}>{value}</span>
      <span className="text-[10px] font-bold text-[#1e1b4b]/50">{label}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-5 text-[12px] font-bold uppercase text-[#1e1b4b]/30">{children}</p>;
}

// --- Composant principal ----------------------------------------------------
export function AdminContent({ locale }: { locale: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("stats");

  return (
    <motion.main
      initial="hidden"
      animate="show"
      className="flex min-h-[100dvh] flex-col bg-[#f0ecff]"
    >
      <motion.div variants={fadeUp} className="px-5 pb-1 pt-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${locale}/settings`)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1e1b4b]"
            style={{ boxShadow: CARD_SHADOW }}
            aria-label="Retour"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-[20px] font-extrabold text-[#1e1b4b]">Poste de pilotage</h1>
            <p className="text-[11px] font-semibold text-[#1e1b4b]/40">Reserve au proprietaire</p>
          </div>
        </div>
      </motion.div>

      {/* Onglets */}
      <div className="px-5 pt-3">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-[rgba(124,58,237,0.07)] p-1 text-[12px] font-extrabold">
          {([
            ["stats", "Stats"],
            ["cles", "Cles"],
            ["feedback", "Bugs"],
            ["support", "Support"],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="rounded-lg py-2 transition-colors"
              style={
                tab === id
                  ? { background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff", boxShadow: "0 2px 0 #5b21b6" }
                  : { color: "#7c3aed" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-2 scrollbar-hide">
        {tab === "stats" && <StatsTab />}
        {tab === "cles" && <KeysTab />}
        {tab === "feedback" && <FeedbackTab />}
        {tab === "support" && <SupportTab />}
        <div className="h-16" />
      </div>
    </motion.main>
  );
}

// --- Onglet Stats -----------------------------------------------------------
function StatsTab() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setS)
      .catch(() => setErr(true));
  }, []);

  if (err) return <p className="mt-6 text-center text-[13px] font-semibold text-[#ef4444]">Erreur de chargement.</p>;
  if (!s) return <p className="mt-6 text-center text-[13px] font-semibold text-[#1e1b4b]/40">Chargement...</p>;

  return (
    <div>
      <SectionTitle>Revenus</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <Kpi value={fmtDA(s.revenue.caMonth)} label="CA ce mois" color="#22c55e" />
        <Kpi value={fmtDA(s.revenue.mrr)} label="MRR" color="#7c3aed" />
        <Kpi value={fmtDA(s.revenue.caTotal)} label="CA total" color="#1e1b4b" />
      </div>

      <SectionTitle>Abonnements</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <Kpi value={s.sales.activeTotal} label="Actifs" color="#7c3aed" />
        <Kpi value={s.sales.activePro} label="Pro" color="#f59e0b" />
        <Kpi value={s.sales.activeStarter} label="Starter" color="#8b5cf6" />
        <Kpi value={s.sales.newActivationsMonth} label="Actives ce mois" color="#22c55e" />
        <Kpi value={s.sales.expiringSoon} label="Expire < 7j" color="#f97316" />
        <Kpi value={s.sales.churn} label="Churn" color="#ef4444" />
      </div>

      <SectionTitle>Ventes en attente</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Kpi value={s.sales.unusedCount} label="Cles non utilisees" color="#f59e0b" />
        <Kpi value={fmtDA(s.sales.unusedValue)} label="Valeur potentielle" color="#22c55e" />
      </div>

      <SectionTitle>Utilisateurs</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <Kpi value={s.users.profs} label="Profs" color="#7c3aed" />
        <Kpi value={s.users.newProfs7d} label="Profs +7j" color="#22c55e" />
        <Kpi value={s.users.newProfs30d} label="Profs +30j" color="#16a34a" />
        <Kpi value={s.users.eleves} label="Eleves" color="#f97316" />
        <Kpi value={s.users.parents} label="Parents" color="#fbbf24" />
      </div>

      <SectionTitle>Activite / Viralite</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Kpi value={s.activity.groups} label="Groupes" color="#7c3aed" />
        <Kpi value={s.activity.students} label="Eleves inscrits" color="#22c55e" />
        <Kpi value={s.activity.referralsMonth} label="Parrainages ce mois" color="#f97316" />
        <Kpi value={s.activity.referralsTotal} label="Parrainages total" color="#f59e0b" />
      </div>
    </div>
  );
}

// --- Onglet Cles ------------------------------------------------------------
function KeysTab() {
  const [plan, setPlan] = useState<Plan>("starter");
  const [duree, setDuree] = useState<Duree>("mois");
  const [isTest, setIsTest] = useState(false);
  const [price, setPrice] = useState<number>(DEFAULT_PRICES.starter.mois);
  const [touchedPrice, setTouchedPrice] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keys, setKeys] = useState<KeyItem[]>([]);

  // Pre-remplir le prix au changement de plan/duree, sauf si l'utilisateur l'a
  // deja edite manuellement.
  function selectPlan(p: Plan) {
    setPlan(p);
    if (!touchedPrice) setPrice(DEFAULT_PRICES[p][duree]);
  }
  function selectDuree(d: Duree) {
    setDuree(d);
    if (!touchedPrice) setPrice(DEFAULT_PRICES[plan][d]);
  }

  const loadKeys = useCallback(() => {
    fetch("/api/admin/keys")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setKeys(d.keys ?? []))
      .catch(() => {});
  }, []);
  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function generate() {
    setGenerating(true);
    setNewKey(null);
    setCopied(false);
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, duree, isTest, priceDa: price }),
      });
      const data = await res.json();
      if (res.ok && data.key) {
        setNewKey(data.key);
        loadKeys();
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <SectionTitle>Creer une cle</SectionTitle>

      {/* Type : officiel / test */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-[rgba(124,58,237,0.07)] p-1 text-[12px] font-extrabold">
        <button
          onClick={() => setIsTest(false)}
          className="rounded-lg py-2 transition-colors"
          style={!isTest ? { background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", boxShadow: "0 2px 0 #15803d" } : { color: "#16a34a" }}
        >
          Officielle (vente)
        </button>
        <button
          onClick={() => setIsTest(true)}
          className="rounded-lg py-2 transition-colors"
          style={isTest ? { background: "linear-gradient(135deg, #94a3b8, #64748b)", color: "#fff", boxShadow: "0 2px 0 #475569" } : { color: "#64748b" }}
        >
          Test (hors stats)
        </button>
      </div>

      {/* Plan */}
      <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-[rgba(124,58,237,0.07)] p-1 text-[12px] font-extrabold">
        {(["starter", "pro", "school_starter", "school_pro"] as Plan[]).map((p) => (
          <button
            key={p}
            onClick={() => selectPlan(p)}
            className="rounded-lg py-2 transition-colors"
            style={plan === p ? { background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff", boxShadow: "0 2px 0 #5b21b6" } : { color: "#7c3aed" }}
          >
            {PLAN_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Duree */}
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-[rgba(124,58,237,0.07)] p-1 text-[12px] font-extrabold">
        {(Object.keys(DUREES) as Duree[]).map((d) => (
          <button
            key={d}
            onClick={() => selectDuree(d)}
            className="rounded-lg py-2 transition-colors"
            style={duree === d ? { background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff", boxShadow: "0 2px 0 #5b21b6" } : { color: "#7c3aed" }}
          >
            {DUREES[d].label}
          </button>
        ))}
      </div>

      {/* Prix (masque pour une cle test) */}
      {!isTest && (
        <div className="mt-3">
          <label className="mb-1 block text-[11px] font-bold text-[#1e1b4b]/50">Prix de vente (DA)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={price}
            onChange={(e) => { setTouchedPrice(true); setPrice(Number(e.target.value)); }}
            className="w-full rounded-xl border-2 border-[#e9e5f5] bg-white px-4 py-3 text-[15px] font-extrabold text-[#1e1b4b] outline-none focus:border-[#7c3aed]"
          />
        </div>
      )}

      {/* Bouton generer (3D) */}
      <GenerateButton onClick={generate} disabled={generating} label={generating ? "Generation..." : "Generer la cle"} />

      {/* Cle generee */}
      {newKey && (
        <div className="mt-3 rounded-2xl bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
          <p className="text-[11px] font-bold text-[#1e1b4b]/40">Cle creee (visible une seule fois) :</p>
          <p className="mt-1 select-all break-all font-mono text-[16px] font-extrabold tracking-wider text-[#1e1b4b]">{newKey}</p>
          <button
            onClick={() => { navigator.clipboard?.writeText(newKey); setCopied(true); }}
            className="mt-2 w-full rounded-xl py-2.5 text-[13px] font-extrabold text-white"
            style={{ background: copied ? "#16a34a" : "linear-gradient(135deg, #8b5cf6, #6d28d9)", boxShadow: copied ? "0 2px 0 #15803d" : "0 2px 0 #5b21b6" }}
          >
            {copied ? "Copiee !" : "Copier"}
          </button>
        </div>
      )}

      <SectionTitle>Dernieres cles</SectionTitle>
      <div className="flex flex-col gap-2">
        {keys.length === 0 && <p className="text-[13px] font-semibold text-[#1e1b4b]/40">Aucune cle.</p>}
        {keys.map((k) => {
          const statusLabel = k.is_test ? "TEST" : !k.used ? "Non utilisee" : k.expired ? "Expiree" : "Active";
          const statusColor = k.is_test ? "#64748b" : !k.used ? "#f59e0b" : k.expired ? "#ef4444" : "#22c55e";
          return (
            <div key={k.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3" style={{ boxShadow: CARD_SHADOW }}>
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold text-[#1e1b4b]">
                  {PLAN_LABELS[(k.plan as Plan)] ?? k.plan} · {k.duration_days}j
                </p>
                <p className="text-[11px] font-semibold text-[#1e1b4b]/40">
                  {k.is_test ? "Test" : fmtDA(k.price_da ?? 0)} · {fmtDate(k.created_at)}
                </p>
              </div>
              <span className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-black uppercase" style={{ background: `${statusColor}18`, color: statusColor }}>
                {statusLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GenerateButton({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="mt-4 w-full rounded-xl py-3.5 text-[14px] font-extrabold text-white transition-[transform,box-shadow] duration-[80ms] disabled:opacity-60"
      style={{
        background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
        transform: `translateY(${pressed ? 3 : 0}px)`,
        boxShadow: pressed ? "0 0px 0 #5b21b6" : "0 4px 0 #5b21b6, 0 8px 20px -6px rgba(124,58,237,0.4)",
      }}
    >
      {label}
    </button>
  );
}

// --- Onglet Feedback (bug bounty) -------------------------------------------
function FeedbackTab() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [bonus, setBonus] = useState<Record<string, number>>({});

  const load = useCallback(() => {
    fetch("/api/admin/feedback")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(d.feedback ?? []))
      .catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  return (
    <div>
      <SectionTitle>Bugs & idees</SectionTitle>
      <div className="flex flex-col gap-2">
        {items.length === 0 && <p className="text-[13px] font-semibold text-[#1e1b4b]/40">Aucun retour.</p>}
        {items.map((f) => {
          const isBug = f.type === "bug";
          return (
            <div key={f.id} className="rounded-2xl bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
              <div className="flex items-center gap-2">
                <span className="rounded-md px-2 py-0.5 text-[10px] font-black uppercase" style={{ background: isBug ? "#ef444418" : "#7c3aed18", color: isBug ? "#ef4444" : "#7c3aed" }}>
                  {isBug ? "Bug" : "Idee"}
                </span>
                <span className="rounded-md px-2 py-0.5 text-[10px] font-black uppercase" style={{ background: "#1e1b4b12", color: "#1e1b4b99" }}>
                  {f.status}
                </span>
                <span className="ml-auto text-[10px] font-semibold text-[#1e1b4b]/40">{fmtDate(f.created_at)}</span>
              </div>
              <p className="mt-2 text-[13px] font-semibold text-[#1e1b4b]">{f.message}</p>
              {f.user_email && <p className="mt-1 text-[11px] font-semibold text-[#1e1b4b]/40">{f.user_email}</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => patch(f.id, { status: "reviewed" })} className="rounded-lg bg-[#7c3aed15] px-3 py-1.5 text-[11px] font-extrabold text-[#7c3aed]">Vu</button>
                <button onClick={() => patch(f.id, { status: "dismissed" })} className="rounded-lg bg-[#1e1b4b10] px-3 py-1.5 text-[11px] font-extrabold text-[#1e1b4b]/60">Ignorer</button>
              </div>

              {f.user_id && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#f0ecff] p-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="jours"
                    value={bonus[f.id] ?? ""}
                    onChange={(e) => setBonus((b) => ({ ...b, [f.id]: Number(e.target.value) }))}
                    className="w-20 rounded-lg border-2 border-[#e9e5f5] bg-white px-2 py-1.5 text-[12px] font-extrabold text-[#1e1b4b] outline-none focus:border-[#7c3aed]"
                  />
                  <button
                    onClick={() => patch(f.id, { bonusDays: bonus[f.id] ?? 0 })}
                    disabled={!bonus[f.id]}
                    className="rounded-lg bg-[#22c55e] px-3 py-1.5 text-[11px] font-extrabold text-white disabled:opacity-50"
                  >
                    Offrir bonus
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Onglet Support ---------------------------------------------------------
function SupportTab() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<null | {
    found: boolean;
    email?: string;
    plan?: string | null;
    expires_at?: string | null;
    activated_at?: string | null;
    active?: boolean;
  }>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/prof?email=${encodeURIComponent(email.trim())}`);
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SectionTitle>Rechercher un prof</SectionTitle>
      <input
        type="email"
        placeholder="email du prof"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && search()}
        className="w-full rounded-xl border-2 border-[#e9e5f5] bg-white px-4 py-3 text-[14px] font-semibold text-[#1e1b4b] outline-none focus:border-[#7c3aed]"
      />
      <button
        onClick={search}
        disabled={loading}
        className="mt-2 w-full rounded-xl py-3 text-[13px] font-extrabold text-white disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", boxShadow: "0 3px 0 #5b21b6" }}
      >
        {loading ? "Recherche..." : "Rechercher"}
      </button>

      {result && !result.found && (
        <p className="mt-4 text-center text-[13px] font-semibold text-[#ef4444]">Aucun prof avec cet email.</p>
      )}

      {result?.found && (
        <div className="mt-4 rounded-2xl bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
          <p className="text-[14px] font-extrabold text-[#1e1b4b]">{result.email}</p>
          <div className="mt-3 flex flex-col gap-2 text-[13px] font-semibold text-[#1e1b4b]/70">
            <Row label="Plan" value={result.plan ? (PLAN_LABELS[result.plan as Plan] ?? result.plan) : "Aucun"} />
            <Row label="Statut" value={result.active ? "Actif" : "Inactif / expire"} color={result.active ? "#22c55e" : "#ef4444"} />
            <Row label="Active le" value={fmtDate(result.activated_at ?? null)} />
            <Row label="Expire le" value={fmtDate(result.expires_at ?? null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#1e1b4b]/40">{label}</span>
      <span className="font-extrabold" style={{ color: color ?? "#1e1b4b" }}>{value}</span>
    </div>
  );
}
