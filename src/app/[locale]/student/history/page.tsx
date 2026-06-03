import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { StudentHistoryScreen } from "@/components/student/student-history";

export default async function StudentHistoryPage({
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

  return <StudentHistoryScreen />;
}
