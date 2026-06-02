import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AttendanceScreen } from "@/components/attendance/attendance-screen";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (user.user_metadata?.role === "eleve") {
    redirect(`/${locale}/dashboard`);
  }

  return <AttendanceScreen />;
}
