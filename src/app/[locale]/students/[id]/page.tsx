import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { StudentDetail } from "@/components/students/student-detail";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return <StudentDetail studentId={id} />;
}
