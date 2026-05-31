import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AddStudent } from "@/components/students/add-student";

export default async function AddStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { locale } = await params;
  const { group } = await searchParams;
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

  return <AddStudent preselectedGroupId={group} />;
}
