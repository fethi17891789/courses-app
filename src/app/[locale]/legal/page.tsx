import { LegalContent } from "@/components/legal/legal-content";
import { getAuthUser } from "@/lib/auth-user";
import { toRole } from "@/lib/role-theme";

export default async function LegalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { locale } = await params;
  const { role: roleParam } = await searchParams;

  // Depuis l'ecran de login, personne n'est connecte : le profil en cours de
  // selection arrive par ?role=. Depuis les parametres, on prend celui du
  // compte connecte. A defaut, prof (violet), comme avant.
  const user = roleParam ? null : await getAuthUser();
  const role = toRole(roleParam ?? (user?.user_metadata?.role as string | undefined));

  return <LegalContent locale={locale} role={role} />;
}
