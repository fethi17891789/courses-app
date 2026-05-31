import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "missing_member_id" }, { status: 400 });
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("teacher_id", user.id)
    .single();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
