import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ScheduleScreen } from "@/components/schedule/schedule-screen";

export default async function SchedulePage({
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

  return <ScheduleScreen />;
}
