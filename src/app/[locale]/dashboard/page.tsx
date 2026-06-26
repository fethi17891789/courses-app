import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";

export default async function DashboardPage({
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

  const role = user.user_metadata?.role || "prof";

  if (role === "eleve") {
    return <StudentDashboard user={user} />;
  }

  if (role === "parent") {
    return <ParentDashboard user={user} />;
  }

  return <DashboardContent user={user} />;
}
