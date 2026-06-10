import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

function generateSessionCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "prof") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { quiz_id } = await request.json();
  if (!quiz_id) return NextResponse.json({ error: "missing_quiz_id" }, { status: 400 });

  const { data: quiz } = await supabase.from("quizzes").select("prof_id").eq("id", quiz_id).single();
  if (!quiz || quiz.prof_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Close any existing waiting sessions for this quiz
  await supabase
    .from("quiz_sessions")
    .update({ status: "finished" })
    .eq("quiz_id", quiz_id)
    .eq("prof_id", user.id)
    .in("status", ["waiting", "countdown", "question", "reveal", "leaderboard"]);

  let code = "";
  let session = null;
  for (let attempt = 0; attempt < 10 && !session; attempt++) {
    code = generateSessionCode();
    const { data } = await supabase
      .from("quiz_sessions")
      .insert({ quiz_id, prof_id: user.id, join_code: code })
      .select("id, join_code")
      .single();
    if (data) session = data;
  }

  if (!session) return NextResponse.json({ error: "generic" }, { status: 500 });
  return NextResponse.json({ session });
}

// Student: lookup session by join code
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.toUpperCase();
  if (!code) return NextResponse.json({ error: "missing_code" }, { status: 400 });

  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("id, join_code, status, quiz_id, quizzes(title)")
    .eq("join_code", code)
    .neq("status", "finished")
    .single();

  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ session });
}
