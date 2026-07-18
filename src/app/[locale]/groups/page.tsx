import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/admin-auth";
import { getSchoolScope } from "@/lib/school-scope";
import { redirect } from "next/navigation";
import { GroupsList } from "@/components/groups/groups-list";
import type { Group } from "@/types/groups";

export default async function GroupsPage({
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

  if (user.user_metadata?.role !== "prof") {
    redirect(`/${locale}/dashboard`);
  }

  // Directeur : agrege les groupes de toute l'ecole (service-role). Prof
  // normal : ses propres groupes via RLS.
  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const { data: groups } = await db
    .from("groups")
    .select("*, group_members(count)")
    .in("teacher_id", teacherIds)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatted: Group[] = (groups || []).map((g: any) => ({
    id: g.id,
    teacher_id: g.teacher_id,
    name: g.name,
    level: g.level,
    section: g.section,
    capacity: g.capacity,
    price: g.price,
    payment_mode: g.payment_mode,
    refund_absences: g.refund_absences || false,
    schedules: g.schedules || [],
    join_code: g.join_code,
    created_at: g.created_at,
    member_count: g.group_members?.[0]?.count ?? 0,
  }));

  return <GroupsList groups={formatted} />;
}
