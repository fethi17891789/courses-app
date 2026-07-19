import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const ONESIGNAL_APP_ID = "152972fd-8970-4ab5-a777-19ee800fea9f";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ONESIGNAL_REST_API_KEY not set" });

  const body = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: "push",
    include_aliases: { external_id: [user.id] },
    headings: { en: "Test notification", fr: "Test notification" },
    contents: { en: "Si tu vois ca, les notifications marchent!", fr: "Si tu vois ca, les notifications marchent!" },
  };

  const resp = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const result = await resp.json();

  return NextResponse.json({
    status: resp.status,
    userId: user.id,
    onesignal_response: result,
    request_body: body,
  });
}
