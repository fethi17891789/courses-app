import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { validateString, validateNumber, validateSchedules, firstError } from "@/lib/validate";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: groups, error } = await supabase
    .from("groups")
    .select("*, group_members(count)")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const formatted = (groups || []).map((g) => ({
    ...g,
    member_count: g.group_members?.[0]?.count ?? 0,
    group_members: undefined,
  }));

  return NextResponse.json(formatted);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, level, section, capacity, price, payment_mode, refund_absences, schedules } = body;

  const validationError = firstError(
    validateString(name, "name", { max: 100 }),
    validateString(level, "level", { max: 50 }),
    capacity !== undefined ? validateNumber(capacity, "capacity", { min: 1, max: 200 }) : null,
    price !== undefined ? validateNumber(price, "price", { min: 0, max: 100_000 }) : null,
    validateSchedules(schedules),
  );
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const allowedModes = ["monthly", "per_session", "weekly"];
  const safeMode = allowedModes.includes(payment_mode) ? payment_mode : "monthly";

  const { data, error } = await supabase
    .from("groups")
    .insert({
      teacher_id: user.id,
      name: name.trim().slice(0, 100),
      level: level.trim().slice(0, 50),
      section: section?.trim().slice(0, 50) || null,
      capacity: capacity || 30,
      price: price || 0,
      payment_mode: safeMode,
      refund_absences: refund_absences || false,
      schedules: Array.isArray(schedules) ? schedules : [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
