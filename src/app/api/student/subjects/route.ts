import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// Student feed: subjects for the groups this student belongs to.
// Uses the student_subjects() security-definer function (migration 028).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("student_subjects", {
    uid: user.id,
  });

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ subjects: data || [] });
}
