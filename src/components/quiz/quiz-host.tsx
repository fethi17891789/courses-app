"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase";
import type { QuizSession, SessionPlayer, QuizQuestion, QuizChoice, SessionStatus } from "@/types/quiz";
import { CHOICE_COLORS } from "@/types/quiz";
import {
  resumeAudio, playCountdownBeep, playGo, playTick, playUrgentTick,
  playCorrect, playFanfare, playPlayerJoin, playRevealDrum,
} from "@/lib/quiz-sounds";

const ease = [0.23, 1, 0.32, 1] as const;

// ── Confetti ────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ["#7c3aed", "#ef4444", "#f97316", "#22c55e", "#3b82f6", "#fbbf24", "#ec4899"];

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    type Piece = { x: number; y: number; vx: number; vy: number; color: string; w: number; h: number; rot: number; vr: number };
    const pieces: Piece[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      w: 8 + Math.random() * 8,
      h: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.2,
    }));

    let alive = true;
    function draw() {
      if (!alive) return;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of pieces) {
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vy += 0.04;
        if (p.y > canvas!.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas!.width;
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
    const t = setTimeout(() => { alive = false; }, 6000);
    return () => { alive = false; clearTimeout(t); };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-30" />;
}

// ── Timer bar ────────────────────────────────────────────────────────────────
function TimerBar({ timeLimit, startedAt }: { timeLimit: number; startedAt: string }) {
  const [pct, setPct] = useState(100);
  const [secsLeft, setSecsLeft] = useState(timeLimit);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    function tick() {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, timeLimit - elapsed);
      setPct((remaining / timeLimit) * 100);
      setSecsLeft(Math.ceil(remaining));
      if (remaining <= 5 && remaining > 0) playUrgentTick();
      else if (remaining > 0) playTick();
    }
    intervalRef.current = setInterval(tick, 1000);
    tick();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startedAt, timeLimit]);

  const color = secsLeft <= 5 ? "#ef4444" : secsLeft <= 10 ? "#f97316" : "#22c55e";

  return (
    <div className="relative h-4 w-full overflow-hidden rounded-full bg-white/30">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, width: `${pct}%`, transition: "width 0.9s linear, background 0.3s" }}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-white">
        {secsLeft}s
      </div>
    </div>
  );
}

// ── Avatar chip ───────────────────────────────────────────────────────────────
function Avatar({ player, rank }: { player: SessionPlayer; rank?: number }) {
  const initials = player.player_name.slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white"
        style={{ background: player.avatar_color, boxShadow: `0 3px 0 ${player.avatar_color}99` }}>
        {initials}
        {rank !== undefined && rank < 3 && (
          <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white"
            style={{ background: rank === 0 ? "#f59e0b" : rank === 1 ? "#94a3b8" : "#b45309" }}>
            {rank + 1}
          </div>
        )}
      </div>
      <div>
        <div className="text-[13px] font-bold text-[#1e1b4b] leading-tight">{player.player_name}</div>
        {rank !== undefined && (
          <div className="text-[12px] font-bold" style={{ color: "#7c3aed" }}>{player.score} pts</div>
        )}
      </div>
    </div>
  );
}

// ── Big countdown number ──────────────────────────────────────────────────────
function CountdownDisplay({ onDone }: { onDone: () => void }) {
  const [num, setNum] = useState(3);
  const [showGo, setShowGo] = useState(false);

  useEffect(() => {
    playCountdownBeep(false);
    const t1 = setTimeout(() => { setNum(2); playCountdownBeep(false); }, 1000);
    const t2 = setTimeout(() => { setNum(1); playCountdownBeep(true); }, 2000);
    const t3 = setTimeout(() => { setShowGo(true); playGo(); }, 3000);
    const t4 = setTimeout(() => { onDone(); }, 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: "#1e1b4b" }}>
      <AnimatePresence mode="popLayout">
        {!showGo ? (
          <motion.div
            key={num}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="text-[140px] font-extrabold leading-none"
            style={{ color: "#a78bfa", textShadow: "0 8px 0 #5b21b6" }}>
            {num}
          </motion.div>
        ) : (
          <motion.div
            key="go"
            initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
            animate={{ scale: 1.1, opacity: 1, rotate: 0 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="text-[90px] font-extrabold leading-none"
            style={{ color: "#22c55e", textShadow: "0 8px 0 #15803d" }}>
            GO !
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main host component ───────────────────────────────────────────────────────
export function QuizHost({ sessionId }: { sessionId: string }) {
  const t = useTranslations("quiz");
  const locale = useLocale();
  const router = useRouter();

  type GameData = {
    session: QuizSession & { quizzes: { title: string; quiz_questions: (QuizQuestion & { quiz_choices: QuizChoice[] })[] } };
    players: SessionPlayer[];
  };

  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerCount, setAnswerCount] = useState(0);
  const [pressedBtn, setPressedBtn] = useState<string | null>(null);
  const [countdownDone, setCountdownDone] = useState(false);
  const [showQuit, setShowQuit] = useState(false);
  const supabase = createClient();
  const playerCountRef = useRef(0);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/quiz/sessions/${sessionId}`);
    if (!res.ok) return;
    const json = await res.json();
    setData(json);
    playerCountRef.current = json.players?.length ?? 0;
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    resumeAudio();
    fetchData();
  }, [fetchData]);

  // Realtime: new players joining
  useEffect(() => {
    const channel = supabase.channel(`host-players-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "session_players",
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        playPlayerJoin();
        setData((prev) => prev ? { ...prev, players: [...prev.players, payload.new as SessionPlayer] } : prev);
        playerCountRef.current += 1;
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, supabase]);

  // Polling fallback (works even if Supabase Realtime is not enabled):
  // refresh the player list while in the waiting room.
  useEffect(() => {
    if (data?.session?.status !== "waiting") return;
    const iv = setInterval(fetchData, 3000);
    return () => clearInterval(iv);
  }, [data?.session?.status, fetchData]);

  // Realtime: player answers count
  useEffect(() => {
    if (!data?.session || data.session.status !== "question") return;
    const qId = currentQuestion?.id;
    if (!qId) return;
    setAnswerCount(0);
    const channel = supabase.channel(`host-answers-${sessionId}-${qId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "player_answers",
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        setAnswerCount((n) => n + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.session?.status, data?.session?.current_question_index]);

  // Auto-call start_question after countdown finishes
  useEffect(() => {
    if (data?.session?.status === "countdown" && countdownDone) {
      advance("start_question");
      setCountdownDone(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownDone, data?.session?.status]);

  // Auto-advance: when all players answered, play reveal drum
  const totalPlayers = data?.players?.length ?? 0;
  useEffect(() => {
    if (data?.session?.status === "question" && answerCount > 0 && answerCount >= totalPlayers) {
      playRevealDrum();
    }
  }, [answerCount, totalPlayers, data?.session?.status]);

  // Play correct sound on reveal
  const prevStatusRef = useRef<SessionStatus | null>(null);
  useEffect(() => {
    if (data?.session?.status === "reveal" && prevStatusRef.current !== "reveal") {
      playCorrect();
    }
    prevStatusRef.current = data?.session?.status ?? null;
  }, [data?.session?.status]);

  async function advance(action: string) {
    await fetch(`/api/quiz/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchData();
  }

  function handleQuit() {
    setShowQuit(false);
    // Close the session for everyone, then leave.
    fetch(`/api/quiz/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finish" }),
    });
    router.push(`/${locale}/quiz`);
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#f0ecff" }}>
        <div className="text-[16px] font-bold text-[#7c3aed]">{t("loading")}</div>
      </div>
    );
  }

  const { session, players } = data;
  const questions = session.quizzes?.quiz_questions ?? [];
  const currentQuestion = questions[session.current_question_index];
  const isLastQuestion = session.current_question_index >= questions.length - 1;

  const quitUI = (
    <>
      <button
        onClick={() => setShowQuit(true)}
        aria-label={t("quit")}
        className="fixed left-3 top-3 z-[55] flex h-9 w-9 items-center justify-center rounded-full"
        style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(4px)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <AnimatePresence>
        {showQuit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-5"
            onClick={() => setShowQuit(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.25, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-5"
              style={{ boxShadow: "0 4px 0 #e9e5f5, 0 16px 48px -12px rgba(30,27,75,0.3)" }}
            >
              <p className="text-[15px] font-extrabold text-[#1e1b4b]">{t("quitTitle")}</p>
              <p className="mt-2 text-[13px] font-semibold text-[#1e1b4b]/50">{t("quitConfirm")}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowQuit(false)}
                  className="rounded-xl bg-[#f0ecff] py-3 text-[13px] font-extrabold text-[#7c3aed]"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleQuit}
                  className="rounded-xl py-3 text-[13px] font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
                >
                  {t("quit")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  function PushBtn({
    id, onClick, bg, shadow, textColor = "white", children, fullWidth = false,
  }: {
    id: string; onClick: () => void; bg: string; shadow: string;
    textColor?: string; children: React.ReactNode; fullWidth?: boolean;
  }) {
    const p = pressedBtn === id;
    return (
      <button
        onPointerDown={() => { setPressedBtn(id); resumeAudio(); }}
        onPointerUp={() => setPressedBtn(null)}
        onPointerLeave={() => setPressedBtn(null)}
        onClick={onClick}
        className={`rounded-2xl px-6 py-4 text-[15px] font-extrabold transition-[transform,box-shadow] duration-[80ms] ${fullWidth ? "w-full" : ""}`}
        style={{
          background: bg,
          color: textColor,
          transform: `translateY(${p ? 4 : 0}px)`,
          boxShadow: p ? `0 0px 0 ${shadow}` : `0 4px 0 ${shadow}, 0 8px 24px -6px ${shadow}88`,
        }}>
        {children}
      </button>
    );
  }

  // ── COUNTDOWN ────────────────────────────────────────────────────────────────
  if (session.status === "countdown") {
    return (
      <CountdownDisplay onDone={() => setCountdownDone(true)} />
    );
  }

  // ── WAITING ROOM ─────────────────────────────────────────────────────────────
  if (session.status === "waiting") {
    return (
      <div className="relative flex min-h-screen flex-col overflow-y-auto scrollbar-hide" style={{ background: "#1e1b4b", paddingBottom: 100 }}>
        {quitUI}
        <div className="mx-auto w-full max-w-md px-4 pt-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
            <div className="mb-2 text-[13px] font-bold text-white/50 text-center uppercase tracking-widest">
              {session.quizzes?.title}
            </div>

            <div className="mb-6 overflow-hidden rounded-[28px] bg-white/10 p-6 text-center backdrop-blur-sm"
              style={{ border: "2px solid rgba(255,255,255,0.15)" }}>
              <div className="text-[13px] font-bold text-white/60 uppercase tracking-wider mb-2">{t("roomCode")}</div>
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="text-[56px] font-extrabold text-white tracking-[0.15em] leading-none"
                style={{ textShadow: "0 4px 0 rgba(124,58,237,0.8)" }}>
                {session.join_code}
              </motion.div>
              <div className="mt-3 text-[12px] font-medium text-white/40">
                {t("roomCodeHint")}
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="text-[14px] font-bold text-white/70">
                {t("players", { count: players.length })}
              </div>
              <div className="text-[12px] font-medium text-white/40">{t("waiting")}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {players.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="h-6 w-6 rounded-full text-[11px] font-extrabold text-white flex items-center justify-center"
                      style={{ background: p.avatar_color }}>
                      {p.player_name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-[13px] font-bold text-white">{p.player_name}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 px-4 py-4" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))" }}>
          <div className="mx-auto max-w-md">
            {players.length === 0 ? (
              <div className="rounded-2xl bg-white/10 py-4 text-center text-[14px] font-bold text-white/50">
                {t("waitingPlayers")}
              </div>
            ) : (
              <PushBtn id="start" fullWidth onClick={() => advance("start_countdown")} bg="linear-gradient(135deg, #a78bfa, #7c3aed)" shadow="#5b21b6">
                {t("startWith", { count: players.length })}
              </PushBtn>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── QUESTION ─────────────────────────────────────────────────────────────────
  if (session.status === "question" && currentQuestion) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#1e1b4b" }}>
        {quitUI}
        <div className="flex items-center justify-between pl-14 pr-4 pt-8 pb-3">
          <div className="text-[12px] font-bold text-white/50 uppercase tracking-wider">
            Q{session.current_question_index + 1} / {questions.length}
          </div>
          <div className="text-[12px] font-bold text-white/50">
            {t("answers", { count: answerCount, total: players.length })}
          </div>
        </div>

        <div className="px-4 mb-4">
          {session.question_started_at && (
            <TimerBar
              timeLimit={currentQuestion.time_limit}
              startedAt={session.question_started_at}
            />
          )}
        </div>

        <motion.div
          key={session.current_question_index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-6 flex-1 overflow-hidden rounded-[28px] bg-white/10 p-6 backdrop-blur-sm"
          style={{ border: "2px solid rgba(255,255,255,0.1)" }}>
          <div className="text-[20px] font-extrabold text-white text-center leading-snug">
            {currentQuestion.question_text}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 px-4 pb-safe">
          {currentQuestion.quiz_choices.map((choice) => {
            const col = CHOICE_COLORS[choice.color];
            return (
              <div key={choice.id}
                className="flex items-center gap-2 rounded-2xl p-4"
                style={{ background: col.bg, boxShadow: `0 4px 0 ${col.shadow}` }}>
                <span className="text-[20px]">{col.icon}</span>
                <span className="text-[14px] font-bold text-white leading-tight">{choice.text}</span>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-4" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))" }}>
          <PushBtn id="reveal" fullWidth onClick={() => { playRevealDrum(); advance("reveal"); }} bg="linear-gradient(135deg, #f97316, #ea580c)" shadow="#c2410c">
            {t("reveal")}
          </PushBtn>
        </div>
      </div>
    );
  }

  // ── REVEAL ───────────────────────────────────────────────────────────────────
  if (session.status === "reveal" && currentQuestion) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#1e1b4b" }}>
        {quitUI}
        <div className="px-4 pt-8 pb-4 text-center">
          <div className="text-[13px] font-bold text-white/50 uppercase tracking-wider mb-2">
            Q{session.current_question_index + 1} / {questions.length}
          </div>
          <div className="text-[18px] font-extrabold text-white leading-snug mx-2">
            {currentQuestion.question_text}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 flex-1">
          {currentQuestion.quiz_choices.map((choice) => {
            const col = CHOICE_COLORS[choice.color];
            const isCorrect = choice.is_correct;
            return (
              <motion.div
                key={choice.id}
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: isCorrect ? 1.03 : 0.92, opacity: isCorrect ? 1 : 0.35 }}
                transition={{ duration: 0.4, ease }}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl p-4 min-h-[90px]"
                style={{
                  background: isCorrect ? col.bg : "rgba(255,255,255,0.06)",
                  boxShadow: isCorrect ? `0 6px 0 ${col.shadow}, 0 0 24px ${col.glow}` : "none",
                }}>
                {isCorrect && (
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/30">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                )}
                <span className="text-[14px] font-bold text-white text-center leading-tight">{choice.text}</span>
              </motion.div>
            );
          })}
        </div>

        <div className="px-4 py-4" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))" }}>
          <PushBtn id="leaderboard" fullWidth onClick={() => advance("leaderboard")} bg="linear-gradient(135deg, #a78bfa, #7c3aed)" shadow="#5b21b6">
            {t("viewLeaderboard")}
          </PushBtn>
        </div>
      </div>
    );
  }

  // ── LEADERBOARD ───────────────────────────────────────────────────────────────
  if (session.status === "leaderboard") {
    const sorted = [...players].sort((a, b) => b.score - a.score).slice(0, 8);
    const maxScore = sorted[0]?.score || 1;
    return (
      <div className="flex min-h-screen flex-col overflow-y-auto scrollbar-hide" style={{ background: "#1e1b4b", paddingBottom: 100 }}>
        {quitUI}
        <div className="mx-auto w-full max-w-md px-4 pt-8">
          <div className="mb-6 text-center">
            <div className="text-[13px] font-bold text-white/50 uppercase tracking-wider">
              {t("leaderboard")} — Q{session.current_question_index + 1}/{questions.length}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {sorted.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4, ease }}
                className="overflow-hidden rounded-2xl bg-white/10"
                style={{ border: i === 0 ? "2px solid #f59e0b" : "1px solid rgba(255,255,255,0.1)" }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 text-center text-[16px] font-extrabold"
                    style={{ color: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "rgba(255,255,255,0.4)" }}>
                    {i + 1}
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white"
                    style={{ background: p.avatar_color }}>
                    {p.player_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-white truncate">{p.player_name}</div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(p.score / maxScore) * 100}%` }}
                        transition={{ delay: i * 0.07 + 0.2, duration: 0.6, ease }}
                        className="h-full rounded-full"
                        style={{ background: i === 0 ? "#f59e0b" : "#a78bfa" }}
                      />
                    </div>
                  </div>
                  <div className="text-[14px] font-extrabold" style={{ color: "#a78bfa" }}>
                    {p.score}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 px-4 py-4" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))" }}>
          <div className="mx-auto flex max-w-md gap-3">
            {isLastQuestion ? (
              <PushBtn id="finish" fullWidth onClick={() => { playFanfare(); advance("finish"); }} bg="linear-gradient(135deg, #4ade80, #22c55e)" shadow="#15803d">
                {t("finishQuiz")}
              </PushBtn>
            ) : (
              <PushBtn id="next" fullWidth onClick={() => advance("next_question")} bg="linear-gradient(135deg, #a78bfa, #7c3aed)" shadow="#5b21b6">
                {t("nextQuestion")}
              </PushBtn>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── FINISHED / PODIUM ─────────────────────────────────────────────────────────
  if (session.status === "finished") {
    const podium = [...players].sort((a, b) => b.score - a.score).slice(0, 3);
    const heights = [120, 90, 70];
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden" style={{ background: "#1e1b4b" }}>
        <ConfettiCanvas />

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
          className="relative z-10 w-full max-w-md px-4">
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              className="text-[40px] font-extrabold text-white leading-tight">
              {t("quizEnd")}
            </motion.div>
            <div className="mt-1 text-[14px] font-medium text-white/50">{session.quizzes?.title}</div>
          </div>

          <div className="flex items-end justify-center gap-3 mb-8">
            {[1, 0, 2].map((idx) => {
              const p = podium[idx];
              if (!p) return <div key={idx} className="w-24" />;
              const rank = idx;
              const h = heights[rank];
              const podiumColor = rank === 0 ? "#f59e0b" : rank === 1 ? "#94a3b8" : "#b45309";
              return (
                <motion.div
                  key={p.id}
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + idx * 0.15, type: "spring", stiffness: 200 }}
                  className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full text-[14px] font-extrabold text-white border-2"
                    style={{ background: p.avatar_color, borderColor: podiumColor }}>
                    {p.player_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-[12px] font-bold text-white text-center max-w-[80px] truncate">{p.player_name}</div>
                  <div className="text-[13px] font-extrabold" style={{ color: podiumColor }}>{p.score} pts</div>
                  <div
                    className="w-20 rounded-t-2xl flex items-end justify-center pb-2 text-[22px] font-extrabold text-white"
                    style={{ height: h, background: podiumColor, boxShadow: `0 4px 0 ${podiumColor}88` }}>
                    {rank + 1}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/${locale}/quiz`)}
              className="flex-1 rounded-2xl py-4 text-[15px] font-extrabold text-white"
              style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)" }}>
              {t("back")}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
