import { createClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-user";
import { getSupabaseAdmin } from "@/lib/admin-auth";
import { getSchoolScope } from "@/lib/school-scope";
import { NextResponse } from "next/server";
import { validateString } from "@/lib/validate";

// Edit an announcement: title/body, pinned state, and/or targeted groups.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Directeur : il gere les annonces de toute son ecole, comme sur les autres
  // ecrans. Prof normal : uniquement les siennes, via RLS.
  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const err = validateString(body.title, "title", { max: 120 });
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    updates.title = body.title.trim().slice(0, 120);
  }
  if (body.body !== undefined) {
    const err = validateString(body.body, "body", { max: 4000 });
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    updates.body = body.body.trim().slice(0, 4000);
  }
  if (body.pinned !== undefined) updates.pinned = !!body.pinned;
  if (Object.keys(updates).length > 0) updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length > 0) {
    const { error } = await db
      .from("announcements")
      .update(updates)
      .eq("id", id)
      .in("teacher_id", teacherIds);
    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  // Replace targeted groups if provided.
  if (body.group_ids !== undefined) {
    if (!Array.isArray(body.group_ids) || body.group_ids.length === 0) {
      return NextResponse.json({ error: "no_groups" }, { status: 400 });
    }
    // Confirm ownership of both the announcement and the groups.
    const { data: owned } = await db
      .from("announcements")
      .select("id")
      .eq("id", id)
      .in("teacher_id", teacherIds)
      .single();
    if (!owned) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: ownGroups } = await db
      .from("groups")
      .select("id")
      .in("teacher_id", teacherIds)
      .in("id", body.group_ids);
    const validGroupIds = (ownGroups || []).map((g) => g.id);
    if (validGroupIds.length === 0) {
      return NextResponse.json({ error: "no_groups" }, { status: 400 });
    }

    await db.from("announcement_groups").delete().eq("announcement_id", id);
    await db.from("announcement_groups").insert(
      validGroupIds.map((gid) => ({ announcement_id: id, group_id: gid })),
    );
  }

  const { data: updated } = await db
    .from("announcements")
    .select("*, announcement_groups(group_id)")
    .eq("id", id)
    .in("teacher_id", teacherIds)
    .single();

  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ...updated,
    group_ids: (updated.announcement_groups || []).map(
      (ag: { group_id: string }) => ag.group_id,
    ),
    announcement_groups: undefined,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Directeur : il gere les annonces de toute son ecole, comme sur les autres
  // ecrans. Prof normal : uniquement les siennes, via RLS.
  const scope = await getSchoolScope(user.id);
  const db = scope.isDirector ? getSupabaseAdmin() : supabase;
  const teacherIds = scope.isDirector ? scope.teacherIds : [user.id];

  const { error } = await db
    .from("announcements")
    .delete()
    .eq("id", id)
    .in("teacher_id", teacherIds);

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
