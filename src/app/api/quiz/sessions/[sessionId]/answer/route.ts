import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ sessionId: string }> };

const MAX_POINTS = 1000;
const MIN_POINTS = 100;

export async function POST(request: Request, { params }: Params) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { question_id, choice_id } = await request.json();
  if (!question_id) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("status, question_started_at")
    .eq("id", sessionId)
    .single();

  if (!session || session.status !== "question") {
    return NextResponse.json({ error: "not_in_question" }, { status: 400 });
  }

  const { data: player } = await supabase
    .from("session_players")
    .select("id, score, streak")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!player) return NextResponse.json({ error: "not_in_session" }, { status: 403 });

  // Already answered?
  const { data: existing } = await supabase
    .from("player_answers")
    .select("id")
    .eq("question_id", question_id)
    .eq("player_id", player.id)
    .single();

  if (existing) return NextResponse.json({ error: "already_answered" }, { status: 400 });

  // Compute response time
  const responseMs = session.question_started_at
    ? Date.now() - new Date(session.question_started_at).getTime()
    : null;

  // Check correctness
  let pointsEarned = 0;
  let isCorrect = false;

  if (choice_id) {
    const { data: choice } = await supabase
      .from("quiz_choices")
      .select("is_correct")
      .eq("id", choice_id)
      .single();

    if (choice?.is_correct) {
      isCorrect = true;
      // Points: scale based on speed (faster = more points), within 0..time_limit*1000
      const { data: question } = await supabase
        .from("quiz_questions")
        .select("time_limit, points")
        .eq("id", question_id)
        .single();

      const timeLimit = (question?.time_limit ?? 20) * 1000;
      const ratio = responseMs ? Math.max(0, 1 - responseMs / timeLimit) : 1;
      const base = question?.points ?? MAX_POINTS;
      const streak = player.streak + 1;
      const streakBonus = streak >= 3 ? 1.2 : streak === 2 ? 1.1 : 1;
      pointsEarned = Math.round(Math.max(MIN_POINTS, base * ratio) * streakBonus);
    }
  }

  await supabase.from("player_answers").insert({
    session_id: sessionId,
    question_id,
    player_id: player.id,
    choice_id: choice_id || null,
    response_ms: responseMs,
    points_earned: pointsEarned,
  });

  if (isCorrect) {
    await supabase
      .from("session_players")
      .update({ score: player.score + pointsEarned, streak: player.streak + 1 })
      .eq("id", player.id);
  } else {
    await supabase
      .from("session_players")
      .update({ streak: 0 })
      .eq("id", player.id);
  }

  const totalScore = isCorrect ? player.score + pointsEarned : player.score;
  return NextResponse.json({ correct: isCorrect, points_earned: pointsEarned, total_score: totalScore });
}
