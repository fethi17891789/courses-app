import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { hashKey } from "@/lib/hash-key";

// Discord interactions must run on Node (WebCrypto Ed25519 + service-role insert).
export const runtime = "nodejs";

// Discord interaction + response type constants
const TYPE_PING = 1;
const TYPE_APPLICATION_COMMAND = 2;
const RESPONSE_PONG = 1;
const RESPONSE_MESSAGE = 4;
const FLAG_EPHEMERAL = 64;

const KEY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no confusable chars

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

function generateActivationKey(): string {
  const bytes = randomBytes(16);
  let raw = "";
  for (let i = 0; i < 16; i++) raw += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  return raw.match(/.{1,4}/g)!.join("-"); // XXXX-XXXX-XXXX-XXXX
}

function ephemeral(content: string) {
  return NextResponse.json({
    type: RESPONSE_MESSAGE,
    data: { content, flags: FLAG_EPHEMERAL },
  });
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
    const duree = options.find((o) => o.name === "duree")?.value;
    const plan = options.find((o) => o.name === "plan")?.value ?? "starter";

    const durationDays = duree === "an" ? 365 : 30;
    const planLabel = plan === "pro" ? "Pro (illimite)" : "Starter (45 eleves)";
    const dureeLabel = duree === "an" ? "1 an" : "1 mois";

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
      ].join("\n"),
    );
  }

  return ephemeral("Commande inconnue.");
}
