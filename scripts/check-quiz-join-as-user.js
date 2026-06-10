const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let url = '', serviceKey = '', anonKey = '';
for (const line of fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (m) {
    if (m[1] === 'NEXT_PUBLIC_SUPABASE_URL') url = m[2].trim();
    if (m[1] === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = m[2].trim();
    if (m[1] === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') anonKey = m[2].trim();
  }
}

const EMAIL = 'meslifethi977@gmail.com';
const admin = createClient(url, serviceKey);

async function run() {
  // 1. Pick one of the prof's quizzes and create a fresh WAITING session (service role)
  const { data: quiz } = await admin.from('quizzes').select('id, prof_id').limit(1).single();
  const { data: session, error: sErr } = await admin
    .from('quiz_sessions')
    .insert({ quiz_id: quiz.id, prof_id: quiz.prof_id, join_code: 'TST' + Math.floor(Math.random() * 900 + 100) })
    .select('id, join_code, status')
    .single();
  if (sErr) { console.error('session create error:', sErr); process.exit(1); }
  console.log('Test session:', session.id, session.join_code, session.status);

  // 2. Open a real user session
  const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: sess, error: vErr } = await anon.auth.verifyOtp({ token_hash: linkData.properties.hashed_token, type: 'email' });
  if (vErr) { console.error('verifyOtp error:', vErr); process.exit(1); }
  const token = sess.session.access_token;
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 3. Try to JOIN: insert into session_players exactly like the API does
  const { data: player, error: joinErr } = await userClient
    .from('session_players')
    .insert({ session_id: session.id, user_id: sess.user.id, player_name: 'Fethi', avatar_color: '#7c3aed' })
    .select('id, player_name')
    .single();
  console.log('\n=== JOIN (insert session_players) AS USER ===');
  console.log('error:', joinErr, '| player:', player);

  // 4. Can the user READ the session by code? (quiz_sessions select RLS)
  const { data: readSess, error: readErr } = await userClient
    .from('quiz_sessions').select('id, status').eq('id', session.id).single();
  console.log('\n=== READ SESSION AS USER ===');
  console.log('error:', readErr, '| session:', readSess);

  // cleanup
  await admin.from('quiz_sessions').delete().eq('id', session.id);
  console.log('\n(cleaned up test session)');
}
run();
