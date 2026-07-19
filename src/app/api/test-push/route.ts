import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const ONESIGNAL_APP_ID = "152972fd-8970-4ab5-a777-19ee800fea9f";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "no api key" });

  const userResp = await fetch(
    `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users/by/external_id/${user.id}`,
    { headers: { Authorization: `Key ${apiKey}` } }
  );
  const userData = await userResp.json();
  const subs = (userData.subscriptions || []);
  const activeSubs = subs.filter((s: any) => s.enabled && s.token);

  if (activeSubs.length === 0) {
    return NextResponse.json({
      userId: user.id,
      onesignal_user_found: userResp.ok,
      total_subs: subs.length,
      active_subs: 0,
      subs_detail: subs.map((s: any) => ({ id: s.id, enabled: s.enabled, hasToken: !!s.token, os: s.device_os })),
      error: "no active subscription with token",
    });
  }

  const notifResp = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      target_channel: "push",
      include_subscription_ids: activeSubs.map((s: any) => s.id),
      headings: { en: "Test", fr: "Test" },
      contents: { en: "Si tu vois ca, ca marche!", fr: "Si tu vois ca, ca marche!" },
    }),
  });
  const notifResult = await notifResp.json();

  return NextResponse.json({
    userId: user.id,
    active_subs: activeSubs.length,
    subscription_ids: activeSubs.map((s: any) => s.id),
    notification: notifResult,
  });
}
