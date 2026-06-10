const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let url = '', key = '';
for (const line of fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (m) {
    if (m[1] === 'NEXT_PUBLIC_SUPABASE_URL') url = m[2].trim();
    if (m[1] === 'SUPABASE_SERVICE_ROLE_KEY') key = m[2].trim();
  }
}
const supabase = createClient(url, key);
const PROF = 'e5642e58-27f8-4ffd-b381-570bdfcff9e5';

async function run() {
  // 1. Columns present on an existing group
  const { data: sample } = await supabase.from('groups').select('*').limit(1);
  console.log('=== groups columns ===');
  console.log(sample && sample[0] ? Object.keys(sample[0]) : '(no rows)');

  // 1b. All groups + owners (service role, bypasses RLS)
  const { data: all } = await supabase.from('groups').select('id, name, teacher_id');
  console.log(`\n=== ALL GROUPS: ${all ? all.length : 0} ===`);
  console.table((all || []).map(g => ({ name: g.name, teacher: g.teacher_id.slice(0, 8) })));

  // 2. Try the exact insert the API does
  const payload = {
    teacher_id: PROF,
    name: '__TEST_DELETE_ME__',
    level: '1AM',
    section: null,
    capacity: 30,
    price: 1000,
    payment_mode: 'monthly',
    refund_absences: false,
    schedules: [{ day: 1, start_time: '08:00', end_time: '09:00' }],
  };
  const { data: inserted, error } = await supabase.from('groups').insert(payload).select().single();
  console.log('\n=== insert test ===');
  console.log('error:', error);
  if (inserted) {
    console.log('inserted OK, cleaning up...');
    await supabase.from('groups').delete().eq('id', inserted.id);
  }
}
run();
