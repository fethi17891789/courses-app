const ONESIGNAL_APP_ID = "152972fd-8970-4ab5-a777-19ee800fea9f";
const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

export async function sendPushNotification({
  title,
  message,
  userIds,
  data,
}: {
  title: string;
  message: string;
  userIds: string[];
  data?: Record<string, string>;
}) {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey || userIds.length === 0) return;

  const resp = await fetch(ONESIGNAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      target_channel: "push",
      headings: { en: title, fr: title },
      contents: { en: message, fr: message },
      include_aliases: { external_id: userIds },
      data,
    }),
  });

  if (!resp.ok) {
    console.error("OneSignal push failed:", await resp.text());
  }
}
