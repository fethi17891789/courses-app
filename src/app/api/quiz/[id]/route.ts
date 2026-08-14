import { createClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-user";
import { NextResponse } from "next/server";
import { normalizeType, buildChoices } from "@/lib/quiz-save";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*, quiz_questions(*, quiz_choices(*))")
    .eq("id", id)
    .single();

  if (!quiz) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (quiz.prof_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Sort questions and choices by order_index
  if (quiz.quiz_questions) {
    quiz.quiz_questions.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index);
    for (const q of quiz.quiz_questions) {
      if (q.quiz_choices) {
        q.quiz_choices.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index);
      }
    }
  }

  return NextResponse.json(quiz);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user || user.user_metadata?.role !== "prof") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, questions } = body;

  const { data: existing } = await supabase.from("quizzes").select("prof_id").eq("id", id).single();
  if (!existing || existing.prof_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await supabase
    .from("quizzes")
    .update({ title: title?.trim(), description: description?.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (Array.isArray(questions)) {
    // Delete existing questions (cascades to choices)
    await supabase.from("quiz_questions").delete().eq("quiz_id", id);

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const { data: qq } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: id,
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

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user || user.user_metadata?.role !== "prof") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase.from("quizzes").select("prof_id").eq("id", id).single();
  if (!existing || existing.prof_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await supabase.from("quizzes").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
