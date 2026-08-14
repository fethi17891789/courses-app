import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth-user";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getAuthUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const role = user.user_metadata?.role || "prof";

  if (role === "eleve") {
    return <StudentDashboard user={user} />;
  }

  if (role === "parent") {
    return <ParentDashboard user={user} />;
  }

  // Le directeur d'ecole reste un prof normal (il enseigne aussi). Son
  // tableau de bord est identique ; la carte "Ecole" est ajoutee cote client.
  return <DashboardContent user={user} />;
}
