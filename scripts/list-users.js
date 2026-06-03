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
  console.log("Fetching users...");
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error("Error listing users:", error);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log("No users found in database.");
    process.exit(0);
  }

  console.log("Found users:");
  console.table(users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.user_metadata?.role,
    full_name: u.user_metadata?.full_name
  })));
}

run();
