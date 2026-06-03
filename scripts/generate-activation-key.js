/**
 * Generate a new activation key for a customer.
 *
 * Usage:
 *   node scripts/generate-activation-key.js [duration_days]
 *
 * Examples:
 *   node scripts/generate-activation-key.js          -> key without expiry
 *   node scripts/generate-activation-key.js 30       -> key valid 30 days
 *   node scripts/generate-activation-key.js 365      -> key valid 1 year
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

async function run() {
  const durationDays = process.argv[2] ? parseInt(process.argv[2], 10) : null;

  const plainKey = generateCode();
  const hashed = hashKey(plainKey);

  const { error } = await supabase.from("activation_keys").insert({
    key: hashed,
    duration_days: durationDays,
  });

  if (error) {
    console.error("Error inserting key:", error.message);
    process.exit(1);
  }

  console.log("");
  console.log("=".repeat(50));
  console.log("  NEW ACTIVATION KEY GENERATED");
  console.log("=".repeat(50));
  console.log("");
  console.log("  Code client :  " + plainKey);
  console.log("  Duree :        " + (durationDays ? durationDays + " jours" : "illimitee"));
  console.log("");
  console.log("  IMPORTANT: Ce code ne sera plus jamais");
  console.log("  affiche. Copiez-le maintenant.");
  console.log("");
  console.log("=".repeat(50));
  console.log("");
}

run();
