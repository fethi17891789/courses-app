import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// Student feed: announcements for the groups this student belongs to.
// Uses the student_announcements() security-definer function (migration 025).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("student_announcements", {
    uid: user.id,
  });

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const announcements = data || [];
  const unread = announcements.filter(
    (a: { read_at: string | null }) => !a.read_at,
  ).length;

  return NextResponse.json({ announcements, unread });
}
