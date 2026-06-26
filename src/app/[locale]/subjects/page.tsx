import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { SubjectsList } from "@/components/subjects/subjects-list";
import { StudentSubjects } from "@/components/subjects/student-subjects";
import type { Subject } from "@/types/subjects";
import type { Group } from "@/types/groups";

export default async function SubjectsPage({
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
    return <StudentSubjects />;
  }

  // Any other non-teacher role (e.g. parent) has no subjects view yet.
  if (user.user_metadata?.role !== "prof") {
    redirect(`/${locale}/dashboard`);
  }

  const { data: rawGroups } = await supabase
    .from("groups")
    .select("id, name, level, section")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  const groups = (rawGroups || []) as Pick<
    Group,
    "id" | "name" | "level" | "section"
  >[];

  const { data: rawSubjects } = await supabase
    .from("subjects")
    .select("*, subject_groups(group_id)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjects: Subject[] = (rawSubjects || []).map((s: any) => ({
    id: s.id,
    teacher_id: s.teacher_id,
    teacher_name: s.teacher_name,
    title: s.title,
    file_path: s.file_path,
    file_size: s.file_size,
    created_at: s.created_at,
    group_ids: (s.subject_groups || []).map(
      (sg: { group_id: string }) => sg.group_id,
    ),
  }));

  return <SubjectsList subjects={subjects} groups={groups} userId={user.id} />;
}
