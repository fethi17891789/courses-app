"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase";
import type { SessionPlayer, QuizQuestion, QuizChoice, SessionStatus } from "@/types/quiz";
import { CHOICE_COLORS, AVATAR_COLORS } from "@/types/quiz";
import {
  resumeAudio, playCountdownBeep, playGo, playCorrect, playWrong, playPoints, playFanfare,
} from "@/lib/quiz-sounds";

const ease = [0.23, 1, 0.32, 1] as const;

// ── Confetti (reused here too) ────────────────────────────────────────────────
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
      x: Math.random() * canvas.width, y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      w: 8 + Math.random() * 8, h: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.2,
    }));
    let alive = true;
    function draw() {
      if (!alive) return;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of pieces) {
        ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vy += 0.04;
        if (p.y > canvas!.height + 20) { p.y = -20; p.x = Math.random() * canvas!.width; }
      }
      requestAnimationFrame(draw);
    }
    draw();
    const t = setTimeout(() => { alive = false; }, 6000);
    return () => { alive = false; clearTimeout(t); };
  }, []);
  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-30" />;
}

// ── Score popup ───────────────────────────────────────────────────────────────
function ScorePopup({ correct, title, subtitle }: { correct: boolean; title: string; subtitle: string }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: -20 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="flex flex-col items-center gap-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 18 }}
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: correct ? "linear-gradient(135deg, #4ade80, #22c55e)" : "linear-gradient(135deg, #f87171, #ef4444)",
            boxShadow: correct ? "0 6px 0 #15803d" : "0 6px 0 #b91c1c",
          }}>
          {correct ? (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          )}
        </motion.div>
        <div className="text-[28px] font-extrabold text-white">{title}</div>
        <div className="text-[14px] font-medium text-white/60">{subtitle}</div>
      </motion.div>
    </AnimatePresence>
  );
}

type GamePhase =
  | { kind: "join" }
  | { kind: "waiting"; sessionId: string; playerId: string; playerName: string; avatarColor: string; players: SessionPlayer[] }
  | { kind: "countdown"; sessionId: string; playerId: string; playerName: string }
  | { kind: "question"; sessionId: string; playerId: string; question: QuizQuestion & { quiz_choices: QuizChoice[] }; qIndex: number; qTotal: number; startedAt: string; answered: boolean; selectedChoiceId?: string }
  | { kind: "result"; correct: boolean; points: number; totalScore?: number; correctChoiceId: string; selectedChoiceId?: string; choices: QuizChoice[]; question: string }
  | { kind: "leaderboard"; players: SessionPlayer[]; playerId: string; sessionId: string; qIndex: number; qTotal: number; isLast: boolean }
  | { kind: "finished"; players: SessionPlayer[]; playerId: string };

type SessionRow = {
  status: SessionStatus;
  current_question_index: number;
  question_started_at: string | null;
};
type PlayerCtx = { sessionId: string; playerId: string; playerName: string };

export function QuizJoin({ prefillCode, displayName }: { prefillCode: string; displayName: string }) {
  const t = useTranslations("quiz");
  const [phase, setPhase] = useState<GamePhase>({ kind: "join" });
  const [code, setCode] = useState(prefillCode);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ctxRef = useRef<PlayerCtx | null>(null);
  // Last status:index already applied, so realtime + polling never double-apply
  // (which would reset the timer or wipe an already-submitted answer).
  const appliedRef = useRef<string>("");
  const [avatarColor] = useState(() => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);

  // Apply a session state transition (shared by realtime + polling fallback)
  const applySessionState = useCallback(async (s: SessionRow, ctx: PlayerCtx) => {
    const key = `${s.status}:${s.current_question_index}`;
    if (appliedRef.current === key) return;
    appliedRef.current = key;
    const { sessionId, playerId, playerName } = ctx;

    if (s.status === "countdown") {
      setPhase({ kind: "countdown", sessionId, playerId, playerName });
    } else if (s.status === "question") {
      const res = await fetch(`/api/quiz/sessions/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      const questions = data.session?.quizzes?.quiz_questions ?? [];
      const q = questions[s.current_question_index];
      if (!q) return;
      setPhase({
        kind: "question",
        sessionId,
        playerId,
        question: q,
        qIndex: s.current_question_index,
        qTotal: questions.length,
        startedAt: s.question_started_at ?? new Date().toISOString(),
        answered: false,
      });
    } else if (s.status === "reveal") {
      // Player who didn't answer in time: show the correct answer instead of staying stuck.
      setPhase((prev) => {
        if (prev.kind !== "question") return prev;
        const correctChoice = prev.question.quiz_choices.find((c) => c.is_correct);
        return {
          kind: "result",
          correct: false,
          points: 0,
          correctChoiceId: correctChoice?.id ?? "",
          choices: prev.question.quiz_choices,
          question: prev.question.question_text,
        };
      });
    } else if (s.status === "leaderboard") {
      const res = await fetch(`/api/quiz/sessions/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      const questions = data.session?.quizzes?.quiz_questions ?? [];
      setPhase({
        kind: "leaderboard",
        players: data.players ?? [],
        playerId,
        sessionId,
        qIndex: s.current_question_index,
        qTotal: questions.length,
        isLast: s.current_question_index >= questions.length - 1,
      });
    } else if (s.status === "finished") {
      playFanfare();
      const res = await fetch(`/api/quiz/sessions/${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setPhase({ kind: "finished", players: data.players ?? [], playerId });
    }
  }, []);

  // Subscribe to session changes for player (realtime)
  const subscribeToSession = useCallback((sessionId: string, playerId: string, playerName: string) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel(`player-session-${sessionId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "quiz_sessions",
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        applySessionState(payload.new as SessionRow, { sessionId, playerId, playerName });
      })
      .subscribe();
    channelRef.current = ch;
  }, [supabase, applySessionState]);

  // Polling fallback: works even when Supabase Realtime is not enabled.
  useEffect(() => {
    const livePhases = ["waiting", "countdown", "question", "result", "leaderboard"];
    if (!livePhases.includes(phase.kind) || !ctxRef.current) return;
    const ctx = ctxRef.current;
    const iv = setInterval(async () => {
      const res = await fetch(`/api/quiz/sessions/${ctx.sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.session) return;
      setPhase((prev) =>
        prev.kind === "waiting" ? { ...prev, players: data.players ?? prev.players } : prev
      );
      applySessionState(data.session as SessionRow, ctx);
    }, 2500);
    return () => clearInterval(iv);
  }, [phase.kind, applySessionState]);

  // Subscribe to new players joining (waiting phase)
  useEffect(() => {
    if (phase.kind !== "waiting") return;
    const { sessionId } = phase;
    const ch = supabase.channel(`player-waiting-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "session_players",
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setPhase((prev) =>
          prev.kind === "waiting"
            ? { ...prev, players: [...prev.players, payload.new as SessionPlayer] }
            : prev
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind]);

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [supabase]);

  // ── Find session by code, then join directly with the logged-in user's name ──
  async function handleCodeSubmit() {
    setError("");
    if (!code.trim()) { setError(t("errEnterCode")); return; }
    setLoading(true);
    const res = await fetch(`/api/quiz/sessions?code=${code.trim().toUpperCase()}`);
    if (!res.ok) {
      setLoading(false);
      const d = await res.json().catch(() => ({}));
      setError(d.error === "not_found" ? t("errInvalidCode") : t("errNetwork"));
      return;
    }
    const { session } = await res.json();

    // Auto-join: the user is logged in, no need to ask for a nickname.
    const joinRes = await fetch(`/api/quiz/sessions/${session.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_name: displayName, avatar_color: avatarColor }),
    });
    if (!joinRes.ok) {
      setLoading(false);
      const d = await joinRes.json().catch(() => ({}));
      console.error("[quiz join]", joinRes.status, d);
      if (d.error === "already_joined") { setError(t("errAlreadyJoined")); return; }
      setError(`${t("errJoin")} (${d.error ?? joinRes.status})`);
      return;
    }
    const { player } = await joinRes.json();
    const sessRes = await fetch(`/api/quiz/sessions/${session.id}`);
    const sessData = sessRes.ok ? await sessRes.json() : { players: [] };

    ctxRef.current = { sessionId: session.id, playerId: player.id, playerName: displayName };
    appliedRef.current = "waiting:0";
    setPhase({
      kind: "waiting",
      sessionId: session.id,
      playerId: player.id,
      playerName: displayName,
      avatarColor,
      players: sessData.players ?? [],
    });
    subscribeToSession(session.id, player.id, displayName);
    resumeAudio();
  }

  // ── Answer submission ─────────────────────────────────────────────────────────
  async function handleAnswer(choiceId: string) {
    if (phase.kind !== "question" || phase.answered) return;
    setPhase((prev) => prev.kind === "question" ? { ...prev, answered: true, selectedChoiceId: choiceId } : prev);
    const res = await fetch(`/api/quiz/sessions/${phase.sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: phase.playerId,
        question_id: phase.question.id,
        choice_id: choiceId,
      }),
    });
    if (!res.ok) return;
    const { correct, points_earned: pointsEarned, total_score: totalScore } = await res.json();
    if (correct) { playCorrect(); } else { playWrong(); }
    if (pointsEarned > 0) setTimeout(playPoints, 500);

    const correctChoice = phase.question.quiz_choices.find((c) => c.is_correct);
    setPhase({
      kind: "result",
      correct,
      points: pointsEarned,
      totalScore,
      correctChoiceId: correctChoice?.id ?? "",
      selectedChoiceId: choiceId,
      choices: phase.question.quiz_choices,
      question: phase.question.question_text,
    });
  }

  // ── Countdown ─────────────────────────────────────────────────────────────────
  if (phase.kind === "countdown") {
    return <PlayerCountdown />;
  }

  // ── Result waiting (answered, waiting for reveal) ─────────────────────────────
  if (phase.kind === "result") {
    const { correct, points, totalScore, correctChoiceId, selectedChoiceId, choices, question } = phase;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "#1e1b4b" }}>
        <div className="mb-4 text-[14px] font-bold text-white/50 text-center">{question}</div>
        <ScorePopup
          correct={correct}
          title={correct ? t("pointsEarned", { points }) : t("missed")}
          subtitle={correct ? t("correct") : t("wrong")}
        />
        <div className="mt-8 w-full max-w-sm grid grid-cols-2 gap-2">
          {choices.map((c) => {
            const col = CHOICE_COLORS[c.color];
            const isSelected = c.id === selectedChoiceId;
            const isCorrect = c.id === correctChoiceId;
            return (
              <div key={c.id}
                className="flex items-center gap-2 rounded-2xl p-3"
                style={{
                  background: isCorrect ? col.bg : "rgba(255,255,255,0.06)",
                  opacity: isCorrect || isSelected ? 1 : 0.4,
                  boxShadow: isCorrect ? `0 4px 0 ${col.shadow}` : "none",
                  outline: isSelected && !isCorrect ? "2px solid #ef4444" : "none",
                }}>
                <span className="text-[16px]">{col.icon}</span>
                <span className="text-[12px] font-bold text-white">{c.text}</span>
              </div>
            );
          })}
        </div>
        {typeof totalScore === "number" && (
          <div className="mt-6 text-[13px] font-bold text-white/40">
            {t("totalScore", { score: totalScore })}
          </div>
        )}
        <div className="mt-2 text-[12px] font-medium text-white/30">{t("waitingLeaderboard")}</div>
      </div>
    );
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────────
  if (phase.kind === "leaderboard") {
    const { players, playerId } = phase;
    const sorted = [...players].sort((a, b) => b.score - a.score).slice(0, 8);
    const myRank = sorted.findIndex((p) => p.id === playerId);
    const maxScore = sorted[0]?.score || 1;
    return (
      <div className="flex min-h-screen flex-col overflow-y-auto scrollbar-hide pb-10" style={{ background: "#1e1b4b" }}>
        <div className="mx-auto w-full max-w-md px-4 pt-10">
          <div className="mb-6 text-center">
            <div className="text-[13px] font-bold text-white/50 uppercase tracking-wider">
              {t("leaderboard")} — Q{phase.qIndex + 1}/{phase.qTotal}
            </div>
            {myRank >= 0 && (
              <div className="mt-1 text-[28px] font-extrabold"
                style={{ color: myRank === 0 ? "#f59e0b" : "#a78bfa" }}>
                {myRank === 0 ? t("rankFirst") : t("rankNth", { rank: myRank + 1 })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {sorted.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4, ease }}
                className="overflow-hidden rounded-2xl"
                style={{
                  background: p.id === playerId ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.08)",
                  border: p.id === playerId ? "2px solid #a78bfa" : i === 0 ? "2px solid #f59e0b" : "1px solid rgba(255,255,255,0.1)",
                }}>
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
                    <div className="text-[14px] font-bold text-white truncate">
                      {p.player_name} {p.id === playerId && <span className="text-[11px] text-white/50">{t("you")}</span>}
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(p.score / maxScore) * 100}%` }}
                        transition={{ delay: i * 0.07 + 0.2, duration: 0.6, ease }}
                        className="h-full rounded-full"
                        style={{ background: p.id === playerId ? "#a78bfa" : i === 0 ? "#f59e0b" : "#6366f1" }}
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

          <div className="mt-6 text-center text-[12px] font-medium text-white/30">
            {phase.isLast ? t("lastSoon") : t("nextSoon")}
          </div>
        </div>
      </div>
    );
  }

  // ── Finished ──────────────────────────────────────────────────────────────────
  if (phase.kind === "finished") {
    const { players, playerId } = phase;
    const sorted = [...players].sort((a, b) => b.score - a.score).slice(0, 3);
    const myRank = [...players].sort((a, b) => b.score - a.score).findIndex((p) => p.id === playerId);
    const heights = [120, 90, 70];
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden" style={{ background: "#1e1b4b" }}>
        <ConfettiCanvas />
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
          className="relative z-10 w-full max-w-md px-4 text-center">
          <div className="mb-2 text-[40px] font-extrabold text-white">{t("quizFinished")}</div>
          {myRank >= 0 && (
            <div className="mb-6 text-[18px] font-bold"
              style={{ color: myRank === 0 ? "#f59e0b" : "#a78bfa" }}>
              {t("youRankScore", {
                rank: myRank === 0 ? t("rankFirst") : t("rankNth", { rank: myRank + 1 }),
                score: players.find((p) => p.id === playerId)?.score ?? 0,
              })}
            </div>
          )}

          <div className="flex items-end justify-center gap-3 mb-8">
            {[1, 0, 2].map((idx) => {
              const p = sorted[idx];
              if (!p) return <div key={idx} className="w-20" />;
              const podiumColor = idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : "#b45309";
              return (
                <motion.div key={p.id} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + idx * 0.15, type: "spring", stiffness: 200 }}
                  className="flex flex-col items-center gap-1">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full text-[12px] font-extrabold text-white border-2"
                    style={{ background: p.avatar_color, borderColor: podiumColor }}>
                    {p.player_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-[11px] font-bold text-white text-center max-w-[70px] truncate">{p.player_name}</div>
                  <div className="text-[12px] font-extrabold" style={{ color: podiumColor }}>{p.score}</div>
                  <div className="w-18 rounded-t-xl flex items-end justify-center pb-2 text-[18px] font-extrabold text-white"
                    style={{ height: heights[idx], width: 72, background: podiumColor }}>
                    {idx + 1}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Waiting room ──────────────────────────────────────────────────────────────
  if (phase.kind === "waiting") {
    const { players } = phase;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "#1e1b4b" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
          <div className="mb-2 text-[22px] font-extrabold text-white">{t("waitingRoom")}</div>
          <div className="mb-6 text-[14px] font-medium text-white/50">
            {t("waitingProfStart")}
          </div>
          <div className="mb-6 overflow-hidden rounded-[22px] bg-white/10 p-5"
            style={{ border: "2px solid rgba(255,255,255,0.12)" }}>
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full text-[18px] font-extrabold text-white mb-2"
              style={{ background: phase.avatarColor }}>
              {phase.playerName.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-[16px] font-bold text-white">{phase.playerName}</div>
            <div className="mt-1 text-[12px] text-white/40">{t("playersInRoom", { count: players.length })}</div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <AnimatePresence>
              {players.map((p) => (
                <motion.div key={p.id}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="flex items-center gap-1.5 rounded-2xl bg-white/10 px-3 py-1.5">
                  <div className="h-5 w-5 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center"
                    style={{ background: p.avatar_color }}>
                    {p.player_name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-[12px] font-bold text-white">{p.player_name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Question screen ───────────────────────────────────────────────────────────
  if (phase.kind === "question") {
    const { question, answered, selectedChoiceId, qIndex, qTotal, startedAt } = phase;
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#1e1b4b" }}>
        <div className="flex items-center justify-between px-4 pt-6 pb-2">
          <div className="text-[12px] font-bold text-white/50">Q{qIndex + 1}/{qTotal}</div>
        </div>

        <div className="px-4 mb-4">
          <PlayerTimerBar timeLimit={question.time_limit} startedAt={startedAt} />
        </div>

        <div className="mx-4 mb-4 overflow-hidden rounded-[22px] bg-white/10 p-5 text-center"
          style={{ border: "2px solid rgba(255,255,255,0.1)" }}>
          <div className="text-[18px] font-extrabold text-white leading-snug">{question.question_text}</div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 flex-1 content-start">
          {question.quiz_choices.map((choice) => {
            const col = CHOICE_COLORS[choice.color];
            const isSelected = selectedChoiceId === choice.id;
            return (
              <motion.button
                key={choice.id}
                whileTap={!answered ? { scale: 0.94 } : {}}
                onClick={() => handleAnswer(choice.id)}
                disabled={answered}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl p-5 min-h-[100px] transition-opacity duration-300"
                style={{
                  background: col.bg,
                  boxShadow: isSelected
                    ? `0 0px 0 ${col.shadow}, 0 0 20px ${col.glow}`
                    : `0 4px 0 ${col.shadow}`,
                  opacity: answered && !isSelected ? 0.5 : 1,
                  transform: isSelected ? "translateY(4px)" : "none",
                }}>
                <span className="text-[28px]">{col.icon}</span>
                <span className="text-[14px] font-bold text-white text-center leading-tight">{choice.text}</span>
              </motion.button>
            );
          })}
        </div>

        {answered && (
          <div className="py-4 text-center text-[13px] font-bold text-white/40">
            {t("answerSaved")}
          </div>
        )}
      </div>
    );
  }

  // ── Join code screen ──────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "#1e1b4b" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-2 text-center text-[28px] font-extrabold text-white">{t("joinTitle")}</div>
        <div className="mb-8 text-center text-[14px] font-medium text-white/50">
          {t("joinSubtitle")}
        </div>

        <div className="mb-4 overflow-hidden rounded-[22px] bg-white/10 p-5"
          style={{ border: "2px solid rgba(255,255,255,0.12)" }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
            placeholder={t("codePlaceholder")}
            maxLength={8}
            autoFocus
            className="w-full bg-transparent text-center text-[36px] font-extrabold text-white tracking-[0.2em] placeholder:text-white/20 focus:outline-none"
          />
        </div>

        <div className="mb-4 text-center text-[12px] font-semibold text-white/40">
          {t("joinAs", { name: displayName })}
        </div>

        {error && (
          <div className="mb-3 rounded-2xl bg-red-500/20 px-4 py-3 text-[13px] font-bold text-red-300">{error}</div>
        )}

        <button
          onClick={handleCodeSubmit}
          disabled={loading || !code.trim()}
          className="w-full rounded-2xl py-4 text-[16px] font-extrabold text-white transition-opacity"
          style={{
            background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
            boxShadow: "0 4px 0 #5b21b6, 0 8px 24px -6px rgba(124,58,237,0.5)",
            opacity: loading || !code.trim() ? 0.6 : 1,
          }}>
          {loading ? t("searching") : t("joinCta")}
        </button>
      </motion.div>
    </div>
  );
}

// ── Player countdown (student-side) ───────────────────────────────────────────
function PlayerCountdown() {
  const [num, setNum] = useState(3);
  const [showGo, setShowGo] = useState(false);

  useEffect(() => {
    playCountdownBeep(false);
    const t1 = setTimeout(() => { setNum(2); playCountdownBeep(false); }, 1000);
    const t2 = setTimeout(() => { setNum(1); playCountdownBeep(true); }, 2000);
    const t3 = setTimeout(() => { setShowGo(true); playGo(); }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: "#1e1b4b" }}>
      <AnimatePresence mode="popLayout">
        {!showGo ? (
          <motion.div key={num}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="text-[140px] font-extrabold leading-none"
            style={{ color: "#a78bfa", textShadow: "0 8px 0 #5b21b6" }}>
            {num}
          </motion.div>
        ) : (
          <motion.div key="go"
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

// ── Player timer bar ──────────────────────────────────────────────────────────
function PlayerTimerBar({ timeLimit, startedAt }: { timeLimit: number; startedAt: string }) {
  const [pct, setPct] = useState(100);
  const [secsLeft, setSecsLeft] = useState(timeLimit);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    function tick() {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, timeLimit - elapsed);
      setPct((remaining / timeLimit) * 100);
      setSecsLeft(Math.ceil(remaining));
    }
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, [startedAt, timeLimit]);

  const color = secsLeft <= 5 ? "#ef4444" : secsLeft <= 10 ? "#f97316" : "#22c55e";

  return (
    <div className="relative h-4 w-full overflow-hidden rounded-full bg-white/20">
      <div className="h-full rounded-full transition-[width] duration-300"
        style={{ background: color, width: `${pct}%` }} />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-white">
        {secsLeft}s
      </div>
    </div>
  );
}
