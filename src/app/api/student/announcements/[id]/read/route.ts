import { createClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-user";
import { NextResponse } from "next/server";

// Mark an announcement as read for the current user (idempotent upsert).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("announcement_reads")
    .upsert(
      { announcement_id: id, user_id: user.id, read_at: new Date().toISOString() },
      { onConflict: "announcement_id,user_id" },
    );

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
