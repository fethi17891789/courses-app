import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth-user";
import { CreateGroup } from "@/components/groups/create-group";

export default async function CreateGroupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getAuthUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (user.user_metadata?.role !== "prof") {
    redirect(`/${locale}/dashboard`);
  }

  return <CreateGroup />;
}
