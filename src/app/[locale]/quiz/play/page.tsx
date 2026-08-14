import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth-user";
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
  const user = await getAuthUser();
  if (!user) redirect(`/${locale}/login`);

  if (user.user_metadata?.role !== "eleve") {
    redirect(`/${locale}/dashboard`);
  }

  const displayName =
    user.user_metadata?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Joueur";

  return <QuizJoin prefillCode={code?.toUpperCase() ?? ""} displayName={displayName} />;
}
