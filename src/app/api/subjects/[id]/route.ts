import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { validateString } from "@/lib/validate";
import { SUBJECTS_BUCKET } from "@/lib/subjects";

function getSupabaseAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Edit a subject: title and/or targeted groups. The file itself is not changed here
// (to swap the PDF, delete and re-upload).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.title !== undefined) {
    const err = validateString(body.title, "title", { max: 120 });
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const { error } = await supabase
      .from("subjects")
      .update({ title: body.title.trim().slice(0, 120) })
      .eq("id", id)
      .eq("teacher_id", user.id);
    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  // Replace targeted groups if provided.
  if (body.group_ids !== undefined) {
    if (!Array.isArray(body.group_ids) || body.group_ids.length === 0) {
      return NextResponse.json({ error: "no_groups" }, { status: 400 });
    }
    const { data: owned } = await supabase
      .from("subjects")
      .select("id")
      .eq("id", id)
      .eq("teacher_id", user.id)
      .single();
    if (!owned) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: ownGroups } = await supabase
      .from("groups")
      .select("id")
      .eq("teacher_id", user.id)
      .in("id", body.group_ids);
    const validGroupIds = (ownGroups || []).map((g) => g.id);
    if (validGroupIds.length === 0) {
      return NextResponse.json({ error: "no_groups" }, { status: 400 });
    }

    await supabase.from("subject_groups").delete().eq("subject_id", id);
    await supabase.from("subject_groups").insert(
      validGroupIds.map((gid) => ({ subject_id: id, group_id: gid })),
    );
  }

  const { data: updated } = await supabase
    .from("subjects")
    .select("*, subject_groups(group_id)")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();

  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ...updated,
    group_ids: (updated.subject_groups || []).map(
      (sg: { group_id: string }) => sg.group_id,
    ),
    subject_groups: undefined,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Read the file path first so we can also clean up Storage.
  const { data: subject } = await supabase
    .from("subjects")
    .select("file_path")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();

  if (!subject) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Best-effort file removal (service role, bypasses Storage RLS).
  const admin = getSupabaseAdmin();
  await admin.storage.from(SUBJECTS_BUCKET).remove([subject.file_path]);

  return NextResponse.json({ success: true });
}
