import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AnnouncementsList } from "@/components/announcements/announcements-list";
import { StudentAnnouncements } from "@/components/announcements/student-announcements";
import type { Announcement } from "@/types/announcements";
import type { Group } from "@/types/groups";

export default async function AnnouncementsPage({
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

  // Students get their read-only feed.
  if (user.user_metadata?.role === "eleve") {
    return <StudentAnnouncements />;
  }

  // Any other non-teacher role (e.g. parent) has no announcements view yet.
  if (user.user_metadata?.role !== "prof") {
    redirect(`/${locale}/dashboard`);
  }

  // Teacher: list own announcements + own groups for the multi-select.
  const { data: rawGroups } = await supabase
    .from("groups")
    .select("id, name, level, section")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const groups = (rawGroups || []) as Pick<
    Group,
    "id" | "name" | "level" | "section"
  >[];

  const { data: rawAnnouncements } = await supabase
    .from("announcements")
    .select("*, announcement_groups(group_id)")
    .eq("teacher_id", user.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const announcements: Announcement[] = (rawAnnouncements || []).map((a: any) => ({
    id: a.id,
    teacher_id: a.teacher_id,
    teacher_name: a.teacher_name,
    title: a.title,
    body: a.body,
    pinned: a.pinned,
    created_at: a.created_at,
    updated_at: a.updated_at,
    group_ids: (a.announcement_groups || []).map(
      (ag: { group_id: string }) => ag.group_id,
    ),
  }));

  return <AnnouncementsList announcements={announcements} groups={groups} />;
}
