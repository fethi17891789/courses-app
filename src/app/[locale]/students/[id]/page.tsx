import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth-user";
import { StudentDetail } from "@/components/students/student-detail";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getAuthUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (user.user_metadata?.role !== "prof") {
    redirect(`/${locale}/dashboard`);
  }

  return <StudentDetail studentId={id} />;
}
