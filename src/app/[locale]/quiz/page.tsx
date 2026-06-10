import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { QuizList } from "@/components/quiz/quiz-list";

export default async function QuizPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.user_metadata?.role !== "prof") redirect(`/${locale}/dashboard`);

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, prof_id, title, description, created_at, updated_at")
    .eq("prof_id", user.id)
    .order("updated_at", { ascending: false });

  return <QuizList quizzes={quizzes ?? []} />;
}
