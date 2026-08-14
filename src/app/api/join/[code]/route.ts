import { getAuthUser } from "@/lib/auth-user";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendPushNotification } from "@/lib/onesignal";

// Service-role client: the join-by-code flow must not depend on group/join_request
// RLS policies (which have historically vanished from the live DB). Authorization is
// enforced in code below (auth check, own-group guard, capacity, existing request).
function getSupabaseAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Limitation PAR COMPTE, pas par adresse IP.
  //
  // C'est une simple lecture, appelee par le bouton "Rechercher" ET par le
  // suivi de statut de l'ecran eleve. L'ancienne limite (10 par IP toutes les
  // 15 min) etait grillee en moins d'une minute par ce suivi : le bouton
  // renvoyait alors "erreur de connexion" pendant un quart d'heure.
  //
  // Par IP, c'etait pire encore : dans une ecole, tous les eleves partagent la
  // meme connexion, donc un seul suffisait a bloquer les autres.
  const { allowed } = rateLimit(`join:${user.id}`, 100, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const admin = getSupabaseAdmin();

  const { data: group, error: groupError } = await admin
    .from("groups")
    .select("id, name, level, section, capacity, price, payment_mode, schedules, group_members(count)")
    .eq("join_code", code.toUpperCase())
    .maybeSingle();

  if (groupError) {
    console.error("[join GET] Supabase error:", groupError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const memberCount = group.group_members?.[0]?.count ?? 0;

  const { data: existingRequest } = await admin
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
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { full_name, phone, parent_phone, level, section, notes, selected_schedules } = body;

  if (!full_name?.trim() || !level?.trim() || !parent_phone?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: group } = await admin
    .from("groups")
    .select("id, name, capacity, teacher_id")
    .eq("join_code", code.toUpperCase())
    .maybeSingle();

  if (!group) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (group.teacher_id === user.id) {
    return NextResponse.json({ error: "own_group" }, { status: 400 });
  }

  const { count } = await admin
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", group.id);

  if (count !== null && count >= group.capacity) {
    return NextResponse.json({ error: "group_full" }, { status: 400 });
  }

  const { data: existing } = await admin
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
    const { error } = await admin
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
    await sendPushNotification({
      title: "Nouvelle demande",
      message: `${full_name.trim()} veut rejoindre ${group.name}`,
      userIds: [group.teacher_id],
      data: { type: "join_request", group_id: group.id },
    });
    return NextResponse.json({ id: existing.id, status: "pending" });
  }

  const requestId = crypto.randomUUID();

  const { error } = await admin
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

  await sendPushNotification({
    title: "Nouvelle demande",
    message: `${full_name.trim()} veut rejoindre ${group.name}`,
    userIds: [group.teacher_id],
    data: { type: "join_request", group_id: group.id },
  });

  return NextResponse.json({ id: requestId, status: "pending" });
}
