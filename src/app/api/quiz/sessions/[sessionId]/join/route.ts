import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { AVATAR_COLORS } from "@/types/quiz";

type Params = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("status")
    .eq("id", sessionId)
    .single();

  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (session.status !== "waiting") {
    return NextResponse.json({ error: "already_started" }, { status: 400 });
  }

  // Check if already joined
  const { data: existing } = await supabase
    .from("session_players")
    .select("id, player_name, avatar_color, score")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (existing) return NextResponse.json({ player: existing });

  const body = await request.json().catch(() => ({}));
  const playerName = body.player_name?.trim() || user.user_metadata?.full_name || user.email?.split("@")[0] || "Joueur";
  const avatarColor = body.avatar_color || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const { data: player, error } = await supabase
    .from("session_players")
    .insert({ session_id: sessionId, user_id: user.id, player_name: playerName, avatar_color: avatarColor })
    .select("id, player_name, avatar_color, score")
    .single();

  if (error || !player) return NextResponse.json({ error: "generic" }, { status: 500 });
  return NextResponse.json({ player });
}
