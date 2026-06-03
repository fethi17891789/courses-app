import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: group, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();

  if (error || !group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: members } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", id)
    .order("joined_at", { ascending: true });

  const { data: requests } = await supabase
    .from("join_requests")
    .select("*")
    .eq("group_id", id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return NextResponse.json({
    ...group,
    members: members || [],
    requests: requests || [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.level !== undefined) updates.level = body.level.trim();
  if (body.section !== undefined) updates.section = body.section?.trim() || null;
  if (body.capacity !== undefined) updates.capacity = body.capacity;
  if (body.price !== undefined) updates.price = body.price;
  if (body.payment_mode !== undefined) updates.payment_mode = body.payment_mode;
  if (body.refund_absences !== undefined) updates.refund_absences = body.refund_absences;
  if (body.schedules !== undefined) updates.schedules = body.schedules;

  const { data, error } = await supabase
    .from("groups")
    .update(updates)
    .eq("id", id)
    .eq("teacher_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
