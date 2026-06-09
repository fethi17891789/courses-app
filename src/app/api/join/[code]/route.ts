import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { rateLimitByIp } from "@/lib/rate-limit";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { allowed } = rateLimitByIp(_request, "join", 10, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

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
    .select("id, name, level, section, capacity, price, payment_mode, schedules, group_members(count)")
    .eq("join_code", code.toUpperCase())
    .maybeSingle();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const memberCount = group.group_members?.[0]?.count ?? 0;

  const { data: existingRequest } = await supabase
    .from("join_requests")
    .select("id, status")
    .eq("group_id", group.id)
    .eq("student_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    id: group.id,
    name: group.name,
    level: group.level,
    section: group.section,
    capacity: group.capacity,
    price: group.price,
    payment_mode: group.payment_mode,
    schedules: group.schedules || [],
    member_count: memberCount,
    existing_request: existingRequest || null,
  });
}

export async function POST(
  request: Request,
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

  const body = await request.json();
  const { full_name, phone, parent_phone, level, section, notes, selected_schedules } = body;

  if (!full_name?.trim() || !level?.trim() || !parent_phone?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, capacity, teacher_id")
    .eq("join_code", code.toUpperCase())
    .maybeSingle();

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
    .maybeSingle();

  if (existing) {
    if (existing.status === "pending") {
      return NextResponse.json({ error: "already_requested", status: "pending" }, { status: 409 });
    }
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "already_requested", status: "accepted" }, { status: 409 });
    }
    const { error } = await supabase
      .from("join_requests")
      .update({
        status: "pending",
        resolved_at: null,
        student_name: full_name.trim(),
        student_email: user.email || "",
        phone: phone?.trim() || null,
        parent_phone: parent_phone.trim(),
        level: level.trim(),
        section: section?.trim() || null,
        notes: notes?.trim() || null,
        selected_schedules: Array.isArray(selected_schedules) && selected_schedules.length > 0 ? selected_schedules : null,
      })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    return NextResponse.json({ id: existing.id, status: "pending" });
  }

  const requestId = crypto.randomUUID();

  const { error } = await supabase
    .from("join_requests")
    .insert({
      id: requestId,
      group_id: group.id,
      student_id: user.id,
      student_name: full_name.trim(),
      student_email: user.email || "",
      phone: phone?.trim() || null,
      parent_phone: parent_phone.trim(),
      level: level.trim(),
      section: section?.trim() || null,
      notes: notes?.trim() || null,
      selected_schedules: Array.isArray(selected_schedules) && selected_schedules.length > 0 ? selected_schedules : null,
    });

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ id: requestId, status: "pending" });
}
