import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { CreateGroup } from "@/components/groups/create-group";

export default async function CreateGroupPage({
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

  if (user.user_metadata?.role === "eleve") {
    redirect(`/${locale}/dashboard`);
  }

  return <CreateGroup />;
}
