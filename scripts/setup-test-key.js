const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
let supabaseUrl = '';
let supabaseServiceKey = '';

try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value;
    }
  }
} catch (e) {
  console.error("Could not read .env.local file:", e);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables. Check .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("Fetching activation keys...");
  const { data: keys, error } = await supabase
    .from('activation_keys')
    .select('*');

  if (error) {
    console.error("Error fetching keys:", error);
    process.exit(1);
  }

  if (!keys || keys.length === 0) {
    console.log("No activation keys found in database.");
    process.exit(0);
  }

  console.log("Found keys in DB:");
  console.table(keys);

  // Find a key that is used
  const usedKey = keys.find(k => k.used_by);

  if (!usedKey) {
    console.log("No key is currently associated with a user. Cannot set a 2-minute expiry for a logged-in session.");
    console.log("Please sign up or log in first, then run this script again.");
    process.exit(0);
  }

  // Set expires_at to 2 minutes from now
  const twoMinutesFromNow = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  
  console.log(`Updating key "${usedKey.key}" (used by user ${usedKey.used_by}) to expire at ${twoMinutesFromNow}...`);

  const { data: updatedKey, error: updateError } = await supabase
    .from('activation_keys')
    .update({ expires_at: twoMinutesFromNow })
    .eq('id', usedKey.id)
    .select();

  if (updateError) {
    console.error("Error updating key:", updateError);
    process.exit(1);
  }

  console.log("Successfully updated key!");
  console.table(updatedKey);
}

run();
