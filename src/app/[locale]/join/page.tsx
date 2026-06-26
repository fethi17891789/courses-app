import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { JoinGroup } from "@/components/join/join-group";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { locale } = await params;
  const { code } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (user.user_metadata?.role !== "eleve") {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <JoinGroup
      initialCode={code}
      userName={user.user_metadata?.full_name || ""}
      userPhone={user.user_metadata?.phone || ""}
    />
  );
}
