import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { SessionStatus } from "@/types/quiz";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Use admin client for reads: the quizzes table has no student SELECT policy, so a
  // regular authenticated student would get quizzes=null and see no questions.
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: session } = await admin
    .from("quiz_sessions")
    .select(`
      *,
      quizzes(
        title,
        quiz_questions(
          id, question_text, time_limit, points, order_index, question_type,
          quiz_choices(id, text, is_correct, color, order_index)
        )
      )
    `)
    .eq("id", sessionId)
    .single();

  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Sort
  if (session.quizzes?.quiz_questions) {
    session.quizzes.quiz_questions.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index);
    for (const q of session.quizzes.quiz_questions) {
      q.quiz_choices?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index);
    }
  }

  const { data: players } = await admin
    .from("session_players")
    .select("id, player_name, avatar_color, score, streak")
    .eq("session_id", sessionId)
    .order("score", { ascending: false });

  // Answer distribution for the current question (host bar chart on reveal).
  const answerDistribution: Record<string, number> = {};
  let answerTotal = 0;
  if (session.status === "reveal" || session.status === "leaderboard") {
    const currentQuestionId =
      session.quizzes?.quiz_questions?.[session.current_question_index]?.id;
    if (currentQuestionId) {
      const { data: answers } = await admin
        .from("player_answers")
        .select("choice_id, choice_ids")
        .eq("session_id", sessionId)
        .eq("question_id", currentQuestionId);
      for (const a of answers ?? []) {
        answerTotal++;
        const ids: string[] =
          a.choice_ids && a.choice_ids.length
            ? a.choice_ids
            : a.choice_id
              ? [a.choice_id]
              : [];
        for (const id of ids) {
          answerDistribution[id] = (answerDistribution[id] ?? 0) + 1;
        }
      }
    }
  }

  return NextResponse.json({
    session,
    players: players ?? [],
    answer_distribution: answerDistribution,
    answer_total: answerTotal,
  });
}

// Prof advances game state
export async function PATCH(request: Request, { params }: Params) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "prof") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("prof_id, status, current_question_index, quiz_id")
    .eq("id", sessionId)
    .single();

  if (!session || session.prof_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action } = body;

  const updates: Partial<{ status: SessionStatus; current_question_index: number; question_started_at: string; countdown_started_at: string }> = {};

  if (action === "start_countdown") {
    updates.status = "countdown";
    updates.countdown_started_at = new Date().toISOString();
  } else if (action === "start_question") {
    updates.status = "question";
    updates.question_started_at = new Date().toISOString();
  } else if (action === "reveal") {
    updates.status = "reveal";
  } else if (action === "leaderboard") {
    updates.status = "leaderboard";
  } else if (action === "next_question") {
    updates.status = "countdown";
    updates.current_question_index = session.current_question_index + 1;
    updates.countdown_started_at = new Date().toISOString();
  } else if (action === "finish") {
    updates.status = "finished";
  } else {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error: updateError } = await admin
    .from("quiz_sessions")
    .update(updates)
    .eq("id", sessionId);

  if (updateError) {
    console.error("[quiz PATCH] update failed:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
