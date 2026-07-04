import { createClient } from "@/lib/supabase-server";
import { isOwner } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { AdminContent } from "@/components/admin/admin-content";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Verrou serveur : seul le proprietaire (ADMIN_EMAIL) accede a cette page.
  // Toute autre personne connectee est renvoyee au tableau de bord.
  if (!user) redirect(`/${locale}/login`);
  if (!isOwner(user)) redirect(`/${locale}/dashboard`);

  return <AdminContent locale={locale} />;
}
