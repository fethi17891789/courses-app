import { isOwner } from "@/lib/admin-auth";
import { getAuthUser } from "@/lib/auth-user";
import { redirect } from "next/navigation";
import { AdminContent } from "@/components/admin/admin-content";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getAuthUser();

  // Verrou serveur : seul le proprietaire (ADMIN_EMAIL) accede a cette page.
  // Toute autre personne connectee est renvoyee au tableau de bord.
  if (!user) redirect(`/${locale}/login`);
  if (!isOwner(user)) redirect(`/${locale}/dashboard`);

  return <AdminContent locale={locale} />;
}
