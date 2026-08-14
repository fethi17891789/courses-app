import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth-user";
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
  const user = await getAuthUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (user.user_metadata?.role !== "prof") {
    redirect(`/${locale}/dashboard`);
  }

  return <AddStudent preselectedGroupId={group} />;
}
