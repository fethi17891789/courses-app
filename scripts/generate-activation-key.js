/**
 * Generate a new activation key for a customer.
 *
 * Usage:
 *   node scripts/generate-activation-key.js <plan> <formula>
 *
 * Plans:    starter | pro
 * Formulas: monthly | annual
 *
 * Examples:
 *   node scripts/generate-activation-key.js starter monthly  -> Starter 30 jours
 *   node scripts/generate-activation-key.js starter annual   -> Starter 12 mois (ou 15 si premiere inscription)
 *   node scripts/generate-activation-key.js pro monthly      -> Pro 30 jours
 *   node scripts/generate-activation-key.js pro annual       -> Pro 12 mois (ou 15 si premiere inscription)
 *
 * The plain-text key is shown ONCE in the terminal.
 * Only the SHA-256 hash is stored in the database.
 * Copy the key immediately and give it to the customer.
 */

const { createClient } = require("@supabase/supabase-js");
const { createHash, randomBytes } = require("crypto");
const fs = require("fs");
const path = require("path");

// Parse .env.local
let supabaseUrl = "";
let supabaseServiceKey = "";

try {
  const envContent = fs.readFileSync(
    path.join(__dirname, "../.env.local"),
    "utf8"
  );
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) {
      if (match[1] === "NEXT_PUBLIC_SUPABASE_URL") supabaseUrl = match[2].trim();
      if (match[1] === "SUPABASE_SERVICE_ROLE_KEY") supabaseServiceKey = match[2].trim();
    }
  }
} catch {
  console.error("Could not read .env.local");
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env variables.");
  process.exit(1);
}

function generateCode() {
  const hex = randomBytes(4).toString("hex").toUpperCase();
  return `PROF-${hex}`;
}

function hashKey(key) {
  return createHash("sha256").update(key.trim()).digest("hex");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FORMULAS = {
  monthly: 30,
  annual: 365, // 12 mois par defaut, 15 mois (456j) si premiere inscription
};

async function run() {
  const plan = process.argv[2];
  const formula = process.argv[3];

  if (!plan || !["starter", "pro"].includes(plan)) {
    console.error("Plan requis: starter | pro");
    console.error("Usage: node scripts/generate-activation-key.js <plan> <formula>");
    process.exit(1);
  }

  if (!formula || !["monthly", "annual"].includes(formula)) {
    console.error("Formule requise: monthly | annual");
    console.error("Usage: node scripts/generate-activation-key.js <plan> <formula>");
    process.exit(1);
  }

  const durationDays = FORMULAS[formula];

  const plainKey = generateCode();
  const hashed = hashKey(plainKey);

  const { error } = await supabase.from("activation_keys").insert({
    key: hashed,
    duration_days: durationDays,
    plan: plan,
  });

  if (error) {
    console.error("Error inserting key:", error.message);
    process.exit(1);
  }

  const planLabel = plan === "starter" ? "Starter (45 eleves max)" : "Pro (illimite)";
  const formulaLabel = formula === "monthly" ? "Mensuel (30 jours)" : "Annuel (12 mois, ou 15 si 1ere inscription)";

  console.log("");
  console.log("=".repeat(50));
  console.log("  NEW ACTIVATION KEY GENERATED");
  console.log("=".repeat(50));
  console.log("");
  console.log("  Code client :  " + plainKey);
  console.log("  Plan :         " + planLabel);
  console.log("  Formule :      " + formulaLabel);
  console.log("  Duree :        " + durationDays + " jours");
  console.log("");
  console.log("  IMPORTANT: Ce code ne sera plus jamais");
  console.log("  affiche. Copiez-le maintenant.");
  console.log("");
  console.log("=".repeat(50));
  console.log("");
}

run();
