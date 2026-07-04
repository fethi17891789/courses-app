import { createClient } from "@supabase/supabase-js";
import { after, NextResponse } from "next/server";
import { hashKey } from "@/lib/hash-key";
import { generateActivationKey } from "@/lib/activation-key";

// Discord interactions must run on Node (WebCrypto Ed25519 + service-role insert).
export const runtime = "nodejs";

// Discord interaction + response type constants
const TYPE_PING = 1;
const TYPE_APPLICATION_COMMAND = 2;
const RESPONSE_PONG = 1;
const RESPONSE_MESSAGE = 4;
const FLAG_EPHEMERAL = 64;

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Verify the Ed25519 signature Discord attaches to every request. */
async function isValidSignature(
  signature: string,
  timestamp: string,
  rawBody: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(process.env.DISCORD_PUBLIC_KEY!),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const message = new Uint8Array(
      new TextEncoder().encode(timestamp + rawBody),
    );
    return await crypto.subtle.verify("Ed25519", key, hexToBytes(signature), message);
  } catch {
    return false;
  }
}

function ephemeral(content: string) {
  return NextResponse.json({
    type: RESPONSE_MESSAGE,
    data: { content, flags: FLAG_EPHEMERAL },
  });
}

/**
 * Envoie un message de suivi (ephemeral) ne contenant QUE la cle, sans aucun
 * texte autour. Sur Discord mobile il n'y a pas de bouton "copier le bloc" :
 * un appui long fait "Copier le texte" du message entier. En isolant la cle
 * dans son propre message, ce "Copier le texte" ne renvoie que la cle.
 */
async function sendKeyFollowup(
  applicationId: string,
  token: string,
  plainKey: string,
) {
  try {
    await fetch(
      `https://discord.com/api/v10/webhooks/${applicationId}/${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: plainKey, flags: FLAG_EPHEMERAL }),
      },
    );
  } catch {
    // Le message principal contient deja la cle ; un echec ici n'est pas bloquant.
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const rawBody = await request.text();

  if (!signature || !timestamp || !(await isValidSignature(signature, timestamp, rawBody))) {
    return new NextResponse("invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  // Discord health-check ping
  if (interaction.type === TYPE_PING) {
    return NextResponse.json({ type: RESPONSE_PONG });
  }

  if (interaction.type === TYPE_APPLICATION_COMMAND && interaction.data?.name === "cle") {
    // In a guild the user is under member.user; in DMs it's under user.
    const userId = interaction.member?.user?.id ?? interaction.user?.id ?? "";
    const admins = (process.env.DISCORD_ADMIN_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!admins.includes(userId)) {
      return ephemeral("Tu n'es pas autorise a generer des cles.");
    }

    const options: { name: string; value: string }[] = interaction.data.options ?? [];
    const duree = options.find((o) => o.name === "duree")?.value ?? "mois";
    const plan = options.find((o) => o.name === "plan")?.value ?? "starter";

    // 1 mois = 30 jours. L'annuel fait 9 mois (270 j) ; il passe a 12 mois
    // (360 j) automatiquement a la premiere inscription (bonus 3 mois).
    const DUREES: Record<string, { days: number; label: string }> = {
      mois: { days: 30, label: "1 mois" },
      trimestre: { days: 90, label: "3 mois" },
      annuel: { days: 270, label: "9 mois (12 mois si 1ere inscription)" },
    };
    const { days: durationDays, label: dureeLabel } = DUREES[duree] ?? DUREES.mois;
    const planLabel = plan === "pro" ? "Pro (illimite)" : "Starter (45 eleves)";

    const plainKey = generateActivationKey();

    const { error } = await getSupabaseAdmin()
      .from("activation_keys")
      .insert({
        key: hashKey(plainKey),
        plan,
        duration_days: durationDays,
      });

    if (error) {
      return ephemeral("Erreur lors de la creation de la cle. Reessaie.");
    }

    // Apres la reponse principale, on envoie la cle seule dans un second
    // message pour permettre un "Copier le texte" propre sur mobile.
    after(() => sendKeyFollowup(interaction.application_id, interaction.token, plainKey));

    return ephemeral(
      [
        "Cle d'activation creee :",
        "",
        "```",
        plainKey,
        "```",
        `Duree : ${dureeLabel} · Plan : ${planLabel}`,
        "",
        "Envoie cette cle au prof apres paiement. Elle ne s'affichera plus.",
        "Sur mobile : appui long sur le message ci-dessous (la cle seule) puis \"Copier le texte\".",
      ].join("\n"),
    );
  }

  return ephemeral("Commande inconnue.");
}
