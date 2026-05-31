import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { GroupDetail } from "@/components/groups/group-detail";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();

  if (!group) {
    redirect(`/${locale}/groups`);
  }

  const { data: members } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", id)
    .order("joined_at", { ascending: true });

  const { data: requests } = await supabase
    .from("join_requests")
    .select("*")
    .eq("group_id", id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <GroupDetail
      group={group}
      members={members || []}
      requests={requests || []}
    />
  );
}
