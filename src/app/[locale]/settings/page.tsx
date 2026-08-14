import { isOwner } from "@/lib/admin-auth";
import { getAuthUser } from "@/lib/auth-user";
import { redirect } from "next/navigation";
import { SettingsContent } from "@/components/settings/settings-content";

export default async function SettingsPage({
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
  return <SettingsContent user={user} role={role} owner={isOwner(user)} />;
}
