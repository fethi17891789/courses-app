import { createClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-user";
import { getSchoolScope } from "@/lib/school-scope";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { validateString, firstError } from "@/lib/validate";
import { sendPushNotification } from "@/lib/onesignal";

function getSupabaseAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// List the teacher's own announcements with the groups each one targets.
export async function GET() {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Directeur : annonces de toute l'ecole. Prof normal : les siennes via RLS.
  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const { data: announcements, error } = await db
    .from("announcements")
    .select("*, announcement_groups(group_id)")
    .in("teacher_id", teacherIds)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const formatted = (announcements || []).map((a) => ({
    ...a,
    group_ids: (a.announcement_groups || []).map(
      (ag: { group_id: string }) => ag.group_id,
    ),
    announcement_groups: undefined,
  }));

  return NextResponse.json(formatted);
}

// Create an announcement targeting one or more of the teacher's own groups.
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, body: text, group_ids } = body;

  const validationError = firstError(
    validateString(title, "title", { max: 120 }),
    validateString(text, "body", { max: 4000 }),
  );
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!Array.isArray(group_ids) || group_ids.length === 0) {
    return NextResponse.json({ error: "no_groups" }, { status: 400 });
  }

  // Groupes autorises : les siens, ou ceux de toute l'ecole si directeur.
  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const { data: ownGroups } = await db
    .from("groups")
    .select("id")
    .in("teacher_id", teacherIds)
    .in("id", group_ids);

  const validGroupIds = (ownGroups || []).map((g) => g.id);
  if (validGroupIds.length === 0) {
    return NextResponse.json({ error: "no_groups" }, { status: 400 });
  }

  const teacherName =
    (user.user_metadata?.full_name as string) ||
    user.email?.split("@")[0] ||
    "";

  const { data: announcement, error } = await db
    .from("announcements")
    .insert({
      teacher_id: user.id,
      teacher_name: teacherName,
      title: title.trim().slice(0, 120),
      body: text.trim().slice(0, 4000),
    })
    .select()
    .single();

  if (error || !announcement) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const links = validGroupIds.map((gid) => ({
    announcement_id: announcement.id,
    group_id: gid,
  }));
  const { error: linkError } = await db
    .from("announcement_groups")
    .insert(links);

  if (linkError) {
    // Roll back the orphan announcement so we never leave one without groups.
    await db.from("announcements").delete().eq("id", announcement.id);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Notification push aux eleves des groupes cibles (fire-and-forget)
  const admin = getSupabaseAdmin();
  (async () => {
    const { data: members } = await admin
      .from("group_members")
      .select("student:students(auth_user_id)")
      .in("group_id", validGroupIds);
    const userIds = (members || [])
      .map((m: any) => m.student?.auth_user_id)
      .filter((id: string | null): id is string => !!id);
    const unique = [...new Set(userIds)];
    if (unique.length > 0) {
      await sendPushNotification({
        title: teacherName,
        message: title.trim().slice(0, 120),
        userIds: unique,
        data: { type: "announcement", id: announcement.id },
      });
    }
  })().catch(() => {});

  return NextResponse.json({ ...announcement, group_ids: validGroupIds });
}
