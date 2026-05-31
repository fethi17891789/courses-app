import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function PATCH(
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

  const body = await request.json();
  const { requestId, action } = body;

  if (!requestId || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
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

  const { data: req } = await supabase
    .from("join_requests")
    .select("*")
    .eq("id", requestId)
    .eq("group_id", groupId)
    .eq("status", "pending")
    .single();

  if (!req) {
    return NextResponse.json({ error: "request_not_found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("join_requests")
    .update({
      status: action === "accept" ? "accepted" : "rejected",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (action === "accept") {
    const { error: memberError } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        student_id: req.student_id,
        status: "active",
      });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
