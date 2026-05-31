import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { StudentsList } from "@/components/students/students-list";

export default async function StudentsPage({
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

  return <StudentsList />;
}
