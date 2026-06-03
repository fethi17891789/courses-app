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
  const profUserId = 'e5642e58-27f8-4ffd-b381-570bdfcff9e5';
  const keyToUse = 'PROF-2233C6BB';

  console.log(`Setting up key "${keyToUse}" for user ID: ${profUserId}...`);

  const twoMinutesFromNow = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  // Let's check if the key is already used or if any other key is used by this user.
  // We should make sure we clear any other key used by this user, or just update the specified key.
  // Let's first clear this user's assignment on other keys so we don't have multiple keys assigned to the same user.
  await supabase
    .from('activation_keys')
    .update({ used_by: null, used_at: null, expires_at: null })
    .eq('used_by', profUserId);

  // Now assign keyToUse to the prof user and set expiry to 2 minutes from now.
  const { data, error } = await supabase
    .from('activation_keys')
    .update({
      used_by: profUserId,
      used_at: new Date().toISOString(),
      expires_at: twoMinutesFromNow
    })
    .eq('key', keyToUse)
    .select();

  if (error) {
    console.error("Error setting up activation key:", error);
    process.exit(1);
  }

  console.log("Successfully updated key to expire in 2 minutes:");
  console.table(data);
  console.log(`You can now log in with the account of: meslifethi977@gmail.com`);
}

run();
