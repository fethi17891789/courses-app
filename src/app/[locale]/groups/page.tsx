import { createClient } from "@/lib/supabase-server";
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

  if (user.user_metadata?.role === "eleve") {
    redirect(`/${locale}/dashboard`);
  }

  const { data: groups } = await supabase
    .from("groups")
    .select("*, group_members(count)")
    .eq("teacher_id", user.id)
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
    join_code: g.join_code,
    created_at: g.created_at,
    member_count: g.group_members?.[0]?.count ?? 0,
  }));

  return <GroupsList groups={formatted} />;
}
