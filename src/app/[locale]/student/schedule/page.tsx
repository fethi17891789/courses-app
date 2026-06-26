import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { StudentScheduleScreen } from "@/components/student/student-schedule";

export default async function StudentSchedulePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  if (user.user_metadata?.role !== "eleve") {
    redirect(`/${locale}/dashboard`);
  }

  return <StudentScheduleScreen />;
}
