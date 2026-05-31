import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, level, section, capacity, price, payment_mode, group_members(count)")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const memberCount = group.group_members?.[0]?.count ?? 0;

  const { data: existingRequest } = await supabase
    .from("join_requests")
    .select("id, status")
    .eq("group_id", group.id)
    .eq("student_id", user.id)
    .single();

  return NextResponse.json({
    id: group.id,
    name: group.name,
    level: group.level,
    section: group.section,
    capacity: group.capacity,
    price: group.price,
    payment_mode: group.payment_mode,
    member_count: memberCount,
    existing_request: existingRequest || null,
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, capacity, teacher_id")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (group.teacher_id === user.id) {
    return NextResponse.json({ error: "own_group" }, { status: 400 });
  }

  const { count } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", group.id);

  if (count !== null && count >= group.capacity) {
    return NextResponse.json({ error: "group_full" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("join_requests")
    .select("id, status")
    .eq("group_id", group.id)
    .eq("student_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "already_requested", status: existing.status }, { status: 409 });
  }

  const studentName = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const studentEmail = user.email || "";

  const { data, error } = await supabase
    .from("join_requests")
    .insert({
      group_id: group.id,
      student_id: user.id,
      student_name: studentName,
      student_email: studentEmail,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
