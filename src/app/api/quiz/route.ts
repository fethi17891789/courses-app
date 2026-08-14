import { createClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-user";
import { NextResponse } from "next/server";
import { validateString, firstError } from "@/lib/validate";
import { normalizeType, buildChoices } from "@/lib/quiz-save";

export async function GET() {
  const supabase = await createClient();
  const user = await getAuthUser();
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
  const user = await getAuthUser();
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
          question_type: normalizeType(q.question_type),
          order_index: qi,
        })
        .select("id")
        .single();
      if (!qq) continue;
      if (Array.isArray(q.choices)) {
        await supabase.from("quiz_choices").insert(buildChoices(q.choices, qq.id));
      }
    }
  }

  return NextResponse.json({ id: quiz.id });
}
