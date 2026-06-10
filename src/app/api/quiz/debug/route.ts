import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ auth: false, error: authError?.message });
  }

  const role = user.user_metadata?.role;
  const userId = user.id;

  // Test quizzes table
  const { data: quizzes, error: quizzesError } = await supabase
    .from("quizzes")
    .select("id, title")
    .limit(5);

  // EXACT list-page query, run in the user's authenticated session (RLS applies)
  const { data: listQuery, error: listQueryError } = await supabase
    .from("quizzes")
    .select("id, prof_id, title, description, created_at, updated_at, quiz_questions(id)")
    .eq("prof_id", userId)
    .order("updated_at", { ascending: false });

  // Test quiz_sessions table
  const { data: sessions, error: sessionsError } = await supabase
    .from("quiz_sessions")
    .select("id, status")
    .limit(3);

  // Try insert into quiz_sessions (dry run: will rollback via error)
  const { error: insertError } = await supabase
    .from("quiz_sessions")
    .insert({ quiz_id: "00000000-0000-0000-0000-000000000000", prof_id: userId, join_code: "TEST99" })
    .select("id")
    .single();

  return NextResponse.json({
    auth: true,
    userId,
    role,
    roleIsProf: role === "prof",
    quizzes: quizzes ?? [],
    quizzesError: quizzesError?.message ?? null,
    listQueryCount: listQuery?.length ?? 0,
    listQuery: listQuery ?? [],
    listQueryError: listQueryError?.message ?? null,
    sessions: sessions ?? [],
    sessionsError: sessionsError?.message ?? null,
    sessionInsertError: insertError?.message ?? "insert ok (unexpected — should fail on fk)",
  });
}
