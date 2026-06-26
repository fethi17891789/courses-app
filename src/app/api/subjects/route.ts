import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { validateString } from "@/lib/validate";
import { MAX_SUBJECT_SIZE, SUBJECTS_BUCKET } from "@/lib/subjects";

function getSupabaseAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// List the teacher's own subjects with the groups each one targets.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (user.user_metadata?.role !== "prof") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("*, subject_groups(group_id)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const formatted = (subjects || []).map((s) => ({
    ...s,
    group_ids: (s.subject_groups || []).map(
      (sg: { group_id: string }) => sg.group_id,
    ),
    subject_groups: undefined,
  }));

  return NextResponse.json(formatted);
}

// Create a subject row after the browser uploaded the PDF straight to Storage.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (user.user_metadata?.role !== "prof") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, group_ids, file_path, file_size } = body;

  const titleError = validateString(title, "title", { max: 120 });
  if (titleError) {
    return NextResponse.json({ error: titleError }, { status: 400 });
  }

  if (!Array.isArray(group_ids) || group_ids.length === 0) {
    return NextResponse.json({ error: "no_groups" }, { status: 400 });
  }

  // The file must live inside this teacher's own folder, and respect the size cap.
  if (typeof file_path !== "string" || !file_path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "bad_file" }, { status: 400 });
  }
  if (typeof file_size !== "number" || file_size <= 0 || file_size > MAX_SUBJECT_SIZE) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  async function cleanupFile() {
    await admin.storage.from(SUBJECTS_BUCKET).remove([file_path]);
  }

  // Only keep groups that actually belong to this teacher.
  const { data: ownGroups } = await supabase
    .from("groups")
    .select("id")
    .eq("teacher_id", user.id)
    .in("id", group_ids);

  const validGroupIds = (ownGroups || []).map((g) => g.id);
  if (validGroupIds.length === 0) {
    await cleanupFile();
    return NextResponse.json({ error: "no_groups" }, { status: 400 });
  }

  const teacherName =
    (user.user_metadata?.full_name as string) ||
    user.email?.split("@")[0] ||
    "";

  const { data: subject, error } = await supabase
    .from("subjects")
    .insert({
      teacher_id: user.id,
      teacher_name: teacherName,
      title: title.trim().slice(0, 120),
      file_path,
      file_size,
    })
    .select()
    .single();

  if (error || !subject) {
    await cleanupFile();
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const links = validGroupIds.map((gid) => ({
    subject_id: subject.id,
    group_id: gid,
  }));
  const { error: linkError } = await supabase
    .from("subject_groups")
    .insert(links);

  if (linkError) {
    // Roll back the orphan subject and its file.
    await supabase.from("subjects").delete().eq("id", subject.id);
    await cleanupFile();
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ...subject, group_ids: validGroupIds });
}
