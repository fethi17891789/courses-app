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
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

async function run() {
  // 1. Generate a magic link (does NOT send email) to get an OTP we can verify
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: EMAIL,
  });
  if (linkErr) { console.error('generateLink error:', linkErr); process.exit(1); }
  const hashed = linkData.properties.hashed_token;

  // 2. Verify it on the anon client to obtain a real user session
  const { data: sess, error: verifyErr } = await anon.auth.verifyOtp({
    token_hash: hashed,
    type: 'email',
  });
  if (verifyErr) { console.error('verifyOtp error:', verifyErr); process.exit(1); }
  const token = sess.session.access_token;
  console.log('Signed in as:', sess.user.email, '| role:', sess.user.user_metadata?.role);

  // Build a client that DEFINITELY sends the user's JWT on every request
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 2b. Can the user READ their groups? (confirms select policy + auth.uid())
  const { data: ownGroups, error: selErr } = await userClient.from('groups').select('id, name').limit(5);
  console.log('\n=== SELECT AS USER ===');
  console.log('error:', selErr, '| count:', ownGroups ? ownGroups.length : null, ownGroups || '');

  // 3. Attempt the exact group insert the API does, now under RLS as this user
  const { data: { user } } = await admin.auth.getUser(token);
  const payload = {
    teacher_id: user.id,
    name: '__TEST_DELETE_ME__',
    level: '1AM',
    section: null,
    capacity: 30,
    price: 1000,
    payment_mode: 'monthly',
    refund_absences: false,
    schedules: [{ day: 1, start_time: '08:00', end_time: '09:00' }],
  };
  const { data: inserted, error } = await userClient.from('groups').insert(payload).select().single();
  console.log('\n=== INSERT AS USER (RLS) ===');
  console.log('error:', error);
  if (inserted) {
    console.log('inserted OK -> RLS is fine, cleaning up');
    await admin.from('groups').delete().eq('id', inserted.id);
  }
}
run();
