import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const { name, level, section, capacity, price, payment_mode } = body;

  if (!name?.trim() || !level?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("groups")
    .insert({
      teacher_id: user.id,
      name: name.trim(),
      level: level.trim(),
      section: section?.trim() || null,
      capacity: capacity || 30,
      price: price || 0,
      payment_mode: payment_mode || "monthly",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
