import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth-user";
import { StudentScheduleScreen } from "@/components/student/student-schedule";

export default async function StudentSchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getAuthUser();

  if (!user) redirect(`/${locale}/login`);

  if (user.user_metadata?.role !== "eleve") {
    redirect(`/${locale}/dashboard`);
  }

  return <StudentScheduleScreen />;
}
