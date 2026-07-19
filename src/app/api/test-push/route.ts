import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/onesignal";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  await sendPushNotification({
    title: "Test",
    message: "Si tu vois ca, les notifications marchent!",
    userIds: [user.id],
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
