const ONESIGNAL_APP_ID = "152972fd-8970-4ab5-a777-19ee800fea9f";
const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";
const ONESIGNAL_USERS_URL = "https://api.onesignal.com/apps/" + ONESIGNAL_APP_ID + "/users/by/external_id/";

async function getSubscriptionIds(apiKey: string, externalIds: string[]): Promise<string[]> {
  const subscriptionIds: string[] = [];

  await Promise.all(
    externalIds.map(async (extId) => {
      try {
        const resp = await fetch(ONESIGNAL_USERS_URL + extId, {
          headers: { Authorization: `Key ${apiKey}` },
        });
        if (!resp.ok) {
          console.error("[OneSignal] User lookup failed for", extId, "status:", resp.status);
          return;
        }
        const data = await resp.json();
        const subs = data.subscriptions || [];
        for (const sub of subs) {
          if (sub.enabled && sub.token) {
            subscriptionIds.push(sub.id);
          }
        }
        console.log("[OneSignal] User", extId, "has", subs.length, "subs,", subscriptionIds.length, "active");
      } catch (e) {
        console.error("[OneSignal] User lookup error for", extId, e);
      }
    })
  );

  return subscriptionIds;
}

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
  // Le titre identifie l'appelant : "Nouvelle demande" (join), "Demande
  // acceptee/refusee" (traitement d'une demande), "Absence enregistree"
  // (appel), ou le nom du prof (annonce). Indispensable pour retrouver quelle
  // route declenche un envoi quand il s'en produit plusieurs.
  console.log(`[OneSignal] "${title}" -> ${userIds.length} user(s)`, userIds);
  if (!apiKey || userIds.length === 0) return;

  const subscriptionIds = await getSubscriptionIds(apiKey, userIds);
  if (subscriptionIds.length === 0) {
    console.log("[OneSignal] No active subscriptions found");
    return;
  }

  const body = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: "push",
    include_subscription_ids: subscriptionIds,
    headings: { en: title, fr: title },
    contents: { en: message, fr: message },
    data,
  };

  console.log("[OneSignal] Sending push to", subscriptionIds.length, "subscriptions");

  try {
    const resp = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("[OneSignal] Push failed:", resp.status, text);
    } else {
      console.log("[OneSignal] Push sent:", text);
    }
  } catch (e) {
    console.error("[OneSignal] Push error:", e);
  }
}
