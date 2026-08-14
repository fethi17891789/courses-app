import { createClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-user";
import { getSupabaseAdmin } from "@/lib/admin-auth";
import { getSchoolScope } from "@/lib/school-scope";
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
  const user = await getAuthUser();

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

  // Directeur : peut cibler tout groupe de l'ecole (picker = groupes ecole).
  // Prof salarie : uniquement ses propres groupes.
  const scope = await getSchoolScope(user.id);
  const groupsDb = scope.isDirector ? getSupabaseAdmin() : supabase;
  const groupTeacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const { data: rawGroups } = await groupsDb
    .from("groups")
    .select("id, name, level, section")
    .in("teacher_id", groupTeacherIds)
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
