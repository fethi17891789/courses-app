const { createClient } = require('@supabase/supabase-js');
const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');

// Parse .env.local
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

function hashKey(key) {
  return createHash('sha256').update(key.trim()).digest('hex');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("Fetching all activation keys...");
  const { data: keys, error } = await supabase
    .from('activation_keys')
    .select('id, key');

  if (error) {
    console.error("Error fetching keys:", error);
    process.exit(1);
  }

  if (!keys || keys.length === 0) {
    console.log("No activation keys found.");
    process.exit(0);
  }

  console.log(`Found ${keys.length} key(s). Hashing...`);

  let updated = 0;
  let skipped = 0;

  for (const row of keys) {
    // Skip if already hashed (SHA-256 = 64 hex chars)
    if (/^[a-f0-9]{64}$/.test(row.key)) {
      console.log(`  Key ${row.id}: already hashed, skipping.`);
      skipped++;
      continue;
    }

    const hashed = hashKey(row.key);
    const { error: updateError } = await supabase
      .from('activation_keys')
      .update({ key: hashed })
      .eq('id', row.id);

    if (updateError) {
      console.error(`  Key ${row.id}: ERROR - ${updateError.message}`);
    } else {
      console.log(`  Key ${row.id}: "${row.key}" -> "${hashed.substring(0, 16)}..."`);
      updated++;
    }
  }

  console.log(`\nDone: ${updated} hashed, ${skipped} skipped.`);
}

run();
