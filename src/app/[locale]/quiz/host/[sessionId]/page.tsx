import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { QuizHost } from "@/components/quiz/quiz-host";

export default async function QuizHostPage({
  params,
}: {
  params: Promise<{ locale: string; sessionId: string }>;
}) {
  const { locale, sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.user_metadata?.role !== "prof") redirect(`/${locale}/dashboard`);

  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("prof_id, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.prof_id !== user.id) redirect(`/${locale}/quiz`);

  return <QuizHost sessionId={sessionId} />;
}
