import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { QuizJoin } from "@/components/quiz/quiz-join";

export default async function QuizPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { locale } = await params;
  const { code } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  return <QuizJoin prefillCode={code?.toUpperCase() ?? ""} />;
}
