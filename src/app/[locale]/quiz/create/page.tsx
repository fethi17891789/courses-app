import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { QuizEditor } from "@/components/quiz/quiz-editor";

export default async function CreateQuizPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.user_metadata?.role !== "prof") redirect(`/${locale}/dashboard`);
  return <QuizEditor />;
}
