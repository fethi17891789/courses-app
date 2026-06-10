const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let supabaseUrl = '';
let supabaseServiceKey = '';

try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value;
    }
  }
} catch (e) {
  console.error("Could not read .env.local:", e);
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select('id, prof_id, title, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error reading quizzes:", error);
    process.exit(1);
  }

  console.log(`\n=== QUIZZES IN DB (service role, bypasses RLS): ${quizzes.length} ===`);
  console.table(quizzes.map(q => ({ id: q.id.slice(0, 8), prof_id: q.prof_id.slice(0, 8), title: q.title, created: q.created_at })));

  // Test the exact list-page select (with the embed I added)
  const { data: embedTest, error: embedErr } = await supabase
    .from('quizzes')
    .select('id, prof_id, title, description, created_at, updated_at, quiz_questions(id)')
    .order('updated_at', { ascending: false });
  console.log(`\n=== EMBED QUERY (quiz_questions(id)) ===`);
  console.log('error:', embedErr);
  console.log('rows:', embedTest ? embedTest.length : null, embedTest ? JSON.stringify(embedTest[0]) : '');

  // Dump RLS policies for the quiz tables
  const { data: policies, error: polErr } = await supabase
    .rpc('exec_sql_readonly', { q: "select tablename, policyname, cmd from pg_policies where tablename in ('quizzes','quiz_questions') order by tablename" })
    .then(r => r, e => ({ data: null, error: e }));
  console.log(`\n=== POLICIES (via rpc, may not exist) ===`);
  console.log('policies:', policies, 'err:', polErr);

  const { data: { users } } = await supabase.auth.admin.listUsers();
  console.log(`\n=== USERS: ${users.length} ===`);
  console.table(users.map(u => ({ id: u.id.slice(0, 8), email: u.email, role: u.user_metadata?.role })));
}

run();
