import { createClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-user";
import { getSupabaseAdmin } from "@/lib/admin-auth";
import { getSchoolScope } from "@/lib/school-scope";
import { redirect } from "next/navigation";
import { GroupDetail } from "@/components/groups/group-detail";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (user.user_metadata?.role !== "prof") {
    redirect(`/${locale}/dashboard`);
  }

  // Directeur : acces a tout groupe de son ecole (service-role). Prof : le sien.
  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const { data: group } = await db
    .from("groups")
    .select("*")
    .eq("id", id)
    .in("teacher_id", teacherIds)
    .single();

  if (!group) {
    redirect(`/${locale}/groups`);
  }

  const { data: members } = await db
    .from("group_members")
    .select("*, student:students(full_name, phone, level)")
    .eq("group_id", id)
    .order("joined_at", { ascending: true });

  const { data: requests } = await db
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
