import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth-user";
import { ScheduleScreen } from "@/components/schedule/schedule-screen";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getAuthUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (user.user_metadata?.role !== "prof") {
    redirect(`/${locale}/dashboard`);
  }

  return <ScheduleScreen />;
}
