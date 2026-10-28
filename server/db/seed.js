require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

async function seed() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const passwordHash = await bcrypt.hash('Demo@1234', 10);

  console.log('Seeding database...');

  // 1. Create departments
  const departments = [
    { name: 'General Medicine', code: 'GM', description: 'General outpatient consultations', avg_consultation_minutes: 12 },
    { name: 'Pediatrics', code: 'PD', description: 'Children and adolescent care', avg_consultation_minutes: 15 },
    { name: 'Orthopedics', code: 'OR', description: 'Bone, joint and muscle conditions', avg_consultation_minutes: 18 },
    { name: 'Dermatology', code: 'DM', description: 'Skin conditions and treatment', avg_consultation_minutes: 10 },
    { name: 'ENT', code: 'EN', description: 'Ear, nose and throat', avg_consultation_minutes: 14 },
    { name: 'Ophthalmology', code: 'OP', description: 'Eye care and vision', avg_consultation_minutes: 12 }
  ];

  const { data: deptData, error: deptErr } = await supabase
    .from('departments')
    .upsert(departments, { onConflict: 'code' })
    .select();

  if (deptErr) {
    console.error('Error seeding departments:', deptErr);
    return;
  }
  console.log(`Seeded ${deptData.length} departments`);

  // 2. Create users
  const users = [
    { email: 'admin@mediq.demo', password_hash: passwordHash, full_name: 'Dr. Priya Sharma', role: 'admin', phone: '+91-9876543210' },
    { email: 'reception1@mediq.demo', password_hash: passwordHash, full_name: 'Anita Desai', role: 'staff', phone: '+91-9876543211' },
    { email: 'reception2@mediq.demo', password_hash: passwordHash, full_name: 'Ravi Kumar', role: 'staff', phone: '+91-9876543212' },
    { email: 'doctor.gm@mediq.demo', password_hash: passwordHash, full_name: 'Dr. Arun Mehta', role: 'staff', phone: '+91-9876543213' },
    { email: 'doctor.pd@mediq.demo', password_hash: passwordHash, full_name: 'Dr. Sunita Nair', role: 'staff', phone: '+91-9876543214' },
    { email: 'patient1@demo.test', password_hash: passwordHash, full_name: 'Rajesh Patel', role: 'patient', phone: '+91-9876543220' },
    { email: 'patient2@demo.test', password_hash: passwordHash, full_name: 'Meena Gupta', role: 'patient', phone: '+91-9876543221' },
    { email: 'patient3@demo.test', password_hash: passwordHash, full_name: 'Vikram Singh', role: 'patient', phone: '+91-9876543222' }
  ];

  const { data: userData, error: userErr } = await supabase
    .from('users')
    .upsert(users, { onConflict: 'email' })
    .select();

  if (userErr) {
    console.error('Error seeding users:', userErr);
    return;
  }
  console.log(`Seeded ${userData.length} users`);

  // 3. Create counters
  const counters = [];
  for (const dept of deptData) {
    const numCounters = dept.code === 'GM' ? 3 : 2;
    for (let i = 1; i <= numCounters; i++) {
      counters.push({
        department_id: dept.id,
        counter_number: i,
        label: `${dept.code}-Counter ${i}`,
        is_active: true
      });
    }
  }

  const { data: counterData, error: counterErr } = await supabase
    .from('counters')
    .upsert(counters, { onConflict: 'department_id,counter_number' })
    .select();

  if (counterErr) {
    console.error('Error seeding counters:', counterErr);
    return;
  }
  console.log(`Seeded ${counterData.length} counters`);

  // 4. Assign staff to counters
  const staffUsers = userData.filter(u => u.role === 'staff');
  const gmCounters = counterData.filter(c => c.label.startsWith('GM'));
  if (gmCounters.length > 0 && staffUsers.length > 0) {
    await supabase
      .from('counters')
      .update({ assigned_staff_id: staffUsers[0].id })
      .eq('id', gmCounters[0].id);
  }

  // 5. Create sample tokens for today
  const adminUser = userData.find(u => u.role === 'admin');
  const receptionUser = userData.find(u => u.role === 'staff' && u.email.includes('reception'));
  const gmDept = deptData.find(d => d.code === 'GM');
  const pdDept = deptData.find(d => d.code === 'PD');
  const orDept = deptData.find(d => d.code === 'OR');

  const today = new Date().toISOString().split('T')[0];
  
  const sampleTokens = [
    { token_number: 'GM-001', token_date: today, patient_name: 'Arjun Reddy', patient_phone: '+91-8001000001', patient_age: 34, patient_gender: 'Male', department_id: gmDept.id, status: 'completed', priority: 'normal', created_by: receptionUser.id, completed_at: new Date(Date.now() - 3600000).toISOString(), estimated_wait_minutes: 10, actual_wait_minutes: 12 },
    { token_number: 'GM-002', token_date: today, patient_name: 'Lakshmi Devi', patient_phone: '+91-8001000002', patient_age: 56, patient_gender: 'Female', department_id: gmDept.id, status: 'completed', priority: 'urgent', priority_reason: 'High blood pressure reading', created_by: receptionUser.id, completed_at: new Date(Date.now() - 2400000).toISOString(), estimated_wait_minutes: 5, actual_wait_minutes: 8 },
    { token_number: 'GM-003', token_date: today, patient_name: 'Sanjay Mishra', patient_phone: '+91-8001000003', patient_age: 28, patient_gender: 'Male', department_id: gmDept.id, status: 'in_consultation', priority: 'normal', created_by: receptionUser.id, consultation_started_at: new Date(Date.now() - 600000).toISOString(), estimated_wait_minutes: 20, actual_wait_minutes: 22 },
    { token_number: 'GM-004', token_date: today, patient_name: 'Priya Chopra', patient_phone: '+91-8001000004', patient_age: 42, patient_gender: 'Female', department_id: gmDept.id, status: 'called', priority: 'normal', created_by: receptionUser.id, called_at: new Date(Date.now() - 120000).toISOString(), estimated_wait_minutes: 25 },
    { token_number: 'GM-005', token_date: today, patient_name: 'Mohammed Khan', patient_phone: '+91-8001000005', patient_age: 65, patient_gender: 'Male', department_id: gmDept.id, status: 'waiting', priority: 'urgent', priority_reason: 'Elderly with chest discomfort', created_by: receptionUser.id, estimated_wait_minutes: 8 },
    { token_number: 'GM-006', token_date: today, patient_name: 'Kavitha Nair', patient_phone: '+91-8001000006', patient_age: 31, patient_gender: 'Female', department_id: gmDept.id, status: 'waiting', priority: 'normal', created_by: receptionUser.id, estimated_wait_minutes: 30 },
    { token_number: 'GM-007', token_date: today, patient_name: 'Deepak Joshi', patient_phone: '+91-8001000007', patient_age: 47, patient_gender: 'Male', department_id: gmDept.id, status: 'waiting', priority: 'normal', created_by: receptionUser.id, estimated_wait_minutes: 42 },
    { token_number: 'GM-008', token_date: today, patient_name: 'Fatima Begum', patient_phone: '+91-8001000008', patient_age: 72, patient_gender: 'Female', department_id: gmDept.id, status: 'skipped', priority: 'normal', override_reason: 'Patient stepped out for water', created_by: receptionUser.id, estimated_wait_minutes: 15 },
    { token_number: 'PD-001', token_date: today, patient_name: 'Baby Anika (Suresh)', patient_phone: '+91-8001000010', patient_age: 3, patient_gender: 'Female', department_id: pdDept.id, status: 'waiting', priority: 'normal', created_by: receptionUser.id, estimated_wait_minutes: 15 },
    { token_number: 'PD-002', token_date: today, patient_name: 'Rohan Kapoor', patient_phone: '+91-8001000011', patient_age: 8, patient_gender: 'Male', department_id: pdDept.id, status: 'in_consultation', priority: 'urgent', priority_reason: 'High fever 103°F', created_by: receptionUser.id, consultation_started_at: new Date(Date.now() - 300000).toISOString(), estimated_wait_minutes: 5, actual_wait_minutes: 7 },
    { token_number: 'OR-001', token_date: today, patient_name: 'Suresh Babu', patient_phone: '+91-8001000020', patient_age: 55, patient_gender: 'Male', department_id: orDept.id, status: 'waiting', priority: 'emergency', priority_reason: 'Suspected fracture from fall', created_by: receptionUser.id, estimated_wait_minutes: 3 },
    { token_number: 'OR-002', token_date: today, patient_name: 'Nandini Rao', patient_phone: '+91-8001000021', patient_age: 38, patient_gender: 'Female', department_id: orDept.id, status: 'waiting', priority: 'normal', created_by: receptionUser.id, estimated_wait_minutes: 25 }
  ];

  const { data: tokenData, error: tokenErr } = await supabase
    .from('tokens')
    .upsert(sampleTokens, { onConflict: 'token_number,token_date' })
    .select();

  if (tokenErr) {
    console.error('Error seeding tokens:', tokenErr);
    return;
  }
  console.log(`Seeded ${tokenData.length} tokens`);

  // 6. Create token events for audit trail
  const events = [];
  for (const token of tokenData) {
    events.push({
      token_id: token.id,
      from_status: null,
      to_status: 'waiting',
      changed_by: receptionUser.id,
      reason: 'Token issued at reception',
      created_at: token.created_at
    });

    if (['called', 'in_consultation', 'completed', 'skipped'].includes(token.status)) {
      events.push({
        token_id: token.id,
        from_status: 'waiting',
        to_status: token.status === 'skipped' ? 'skipped' : 'called',
        changed_by: receptionUser.id,
        reason: token.status === 'skipped' ? token.override_reason : 'Patient called to counter'
      });
    }
    if (['in_consultation', 'completed'].includes(token.status)) {
      events.push({
        token_id: token.id,
        from_status: 'called',
        to_status: 'in_consultation',
        changed_by: receptionUser.id,
        reason: 'Consultation started'
      });
    }
    if (token.status === 'completed') {
      events.push({
        token_id: token.id,
        from_status: 'in_consultation',
        to_status: 'completed',
        changed_by: receptionUser.id,
        reason: 'Consultation completed'
      });
    }
  }

  const { error: eventErr } = await supabase
    .from('token_events')
    .insert(events);

  if (eventErr) {
    console.error('Error seeding token events:', eventErr);
  } else {
    console.log(`Seeded ${events.length} token events`);
  }

  // 7. System settings
  const settings = [
    { setting_key: 'clinic_name', setting_value: 'MediQueue Clinic', description: 'Name of the clinic' },
    { setting_key: 'max_tokens_per_day', setting_value: '200', description: 'Maximum tokens that can be issued per day' },
    { setting_key: 'default_consultation_minutes', setting_value: '15', description: 'Default consultation duration in minutes' },
    { setting_key: 'operating_hours_start', setting_value: '08:00', description: 'Clinic opening time' },
    { setting_key: 'operating_hours_end', setting_value: '20:00', description: 'Clinic closing time' },
    { setting_key: 'allow_patient_self_checkin', setting_value: 'false', description: 'Allow patients to create their own tokens' },
    { setting_key: 'auto_skip_after_minutes', setting_value: '5', description: 'Auto-skip if patient does not respond after being called (minutes)' },
    { setting_key: 'display_board_refresh_seconds', setting_value: '10', description: 'Queue display board refresh interval' }
  ];

  const { error: settingsErr } = await supabase
    .from('system_settings')
    .upsert(settings, { onConflict: 'setting_key' });

  if (settingsErr) {
    console.error('Error seeding settings:', settingsErr);
  } else {
    console.log(`Seeded ${settings.length} system settings`);
  }

  console.log('\n=== Seed Complete ===');
  console.log('Demo Login Credentials (all use password: Demo@1234):');
  console.log('  Admin:     admin@mediq.demo');
  console.log('  Staff:     reception1@mediq.demo');
  console.log('  Patient:   patient1@demo.test');
}

seed().catch(console.error);
