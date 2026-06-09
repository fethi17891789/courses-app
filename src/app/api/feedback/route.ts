import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { rateLimitByIp } from "@/lib/rate-limit";
import { validateString, firstError } from "@/lib/validate";

function getSupabaseAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function notifyDiscord(text: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // best effort — DB row is source of truth
  }
}

export async function POST(request: Request) {
  const { allowed } = rateLimitByIp(request, "feedback", 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, message } = body;

  if (type !== "bug" && type !== "idea") {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  const validationError = firstError(
    validateString(message, "message", { min: 10, max: 2000 })
  );
  if (validationError) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }

  const userName = user.user_metadata?.full_name || "";
  const userRole = user.user_metadata?.role || "unknown";
  const admin = getSupabaseAdmin();

  const { error: insertError } = await admin.from("feedback").insert({
    user_id: user.id,
    user_name: userName,
    user_email: user.email,
    type,
    message: message.trim(),
  });

  if (insertError) {
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }

  const label = type === "bug" ? "BUG" : "IDEE";
  const roleLabel = userRole === "eleve" ? "Eleve" : "Prof";
  await notifyDiscord(
    `**[Courses - ${label}]** ${roleLabel} : ${userName || user.email}\n${message.trim()}`
  );

  return NextResponse.json({ success: true });
}
