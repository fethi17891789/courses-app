// Enregistre la commande /cle aupres de Discord. A lancer UNE SEULE FOIS
// (et a relancer seulement si on change la definition de la commande).
//
// Usage :
//   DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... node scripts/register-discord-commands.mjs
//
// Optionnel : DISCORD_GUILD_ID=... pour enregistrer la commande sur un serveur
// precis (mise a jour instantanee). Sans guild, la commande est globale
// (propagation jusqu'a ~1h la premiere fois).

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!APP_ID || !BOT_TOKEN) {
  console.error("Manque DISCORD_APP_ID ou DISCORD_BOT_TOKEN dans l'environnement.");
  process.exit(1);
}

const commands = [
  {
    name: "cle",
    description: "Generer une cle d'activation",
    options: [
      {
        name: "duree",
        description: "Duree de la cle",
        type: 3, // STRING
        required: true,
        choices: [
          { name: "1 mois", value: "mois" },
          { name: "3 mois", value: "trimestre" },
          { name: "9 mois (12 mois si 1ere inscription)", value: "annuel" },
        ],
      },
      {
        name: "plan",
        description: "Plan (defaut : starter)",
        type: 3, // STRING
        required: false,
        choices: [
          { name: "Starter (45 eleves)", value: "starter" },
          { name: "Pro (illimite)", value: "pro" },
        ],
      },
    ],
  },
];

const url = GUILD_ID
  ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${BOT_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (!res.ok) {
  console.error("Echec de l'enregistrement :", res.status, await res.text());
  process.exit(1);
}

console.log(
  `Commande /cle enregistree (${GUILD_ID ? "serveur " + GUILD_ID : "globale"}).`,
);
