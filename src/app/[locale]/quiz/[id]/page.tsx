import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { QuizEditor } from "@/components/quiz/quiz-editor";

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.user_metadata?.role !== "prof") redirect(`/${locale}/dashboard`);

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*, quiz_questions(*, quiz_choices(*))")
    .eq("id", id)
    .single();

  if (!quiz || quiz.prof_id !== user.id) redirect(`/${locale}/quiz`);

  if (quiz.quiz_questions) {
    quiz.quiz_questions.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index);
    for (const q of quiz.quiz_questions) {
      q.quiz_choices?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index);
    }
  }

  return <QuizEditor initialQuiz={quiz} />;
}
