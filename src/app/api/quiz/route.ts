import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { validateString, firstError } from "@/lib/validate";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "prof") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("quizzes")
    .select("id, title, description, created_at, updated_at")
    .eq("prof_id", user.id)
    .order("updated_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "prof") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, questions } = body;

  const err = firstError(validateString(title, "title", { min: 1, max: 120 }));
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const { data: quiz, error: qErr } = await supabase
    .from("quizzes")
    .insert({ prof_id: user.id, title: title.trim(), description: description?.trim() || null })
    .select("id")
    .single();

  if (qErr || !quiz) return NextResponse.json({ error: "generic" }, { status: 500 });

  if (Array.isArray(questions) && questions.length > 0) {
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const { data: qq } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: quiz.id,
          question_text: q.question_text,
          time_limit: q.time_limit ?? 20,
          points: q.points ?? 1000,
          order_index: qi,
        })
        .select("id")
        .single();
      if (!qq) continue;
      const colors = ["red", "blue", "yellow", "green"] as const;
      if (Array.isArray(q.choices)) {
        await supabase.from("quiz_choices").insert(
          q.choices.slice(0, 4).map((c: { text: string; is_correct: boolean }, ci: number) => ({
            question_id: qq.id,
            text: c.text,
            is_correct: !!c.is_correct,
            color: colors[ci] ?? "red",
            order_index: ci,
          }))
        );
      }
    }
  }

  return NextResponse.json({ id: quiz.id });
}
