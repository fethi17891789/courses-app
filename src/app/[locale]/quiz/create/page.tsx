import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth-user";
import { QuizEditor } from "@/components/quiz/quiz-editor";

export default async function CreateQuizPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getAuthUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.user_metadata?.role !== "prof") redirect(`/${locale}/dashboard`);
  return <QuizEditor />;
}
