import { createClient } from "@/lib/supabase-server";
import { isOwner } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { SettingsContent } from "@/components/settings/settings-content";

export default async function SettingsPage({
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
  return <SettingsContent user={user} role={role} owner={isOwner(user)} />;
}
