import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const ONESIGNAL_APP_ID = "152972fd-8970-4ab5-a777-19ee800fea9f";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ONESIGNAL_REST_API_KEY not set" });

  const userUrl = `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users/by/external_id/${user.id}`;
  const userResp = await fetch(userUrl, {
    headers: { Authorization: `Key ${apiKey}` },
  });
  const userData = await userResp.json();

  const activeSubscriptions = (userData.subscriptions || []).filter(
    (s: any) => s.enabled && s.token
  );

  const notifBody = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: "push",
    include_aliases: { external_id: [user.id] },
    headings: { en: "Test", fr: "Test" },
    contents: { en: "Si tu vois ca, les notifications marchent!", fr: "Si tu vois ca, les notifications marchent!" },
  };

  const notifResp = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(notifBody),
  });
  const notifResult = await notifResp.json();

  return NextResponse.json({
    userId: user.id,
    active_subscriptions: activeSubscriptions.length,
    total_subscriptions: (userData.subscriptions || []).length,
    notification_response: notifResult,
  });
}
