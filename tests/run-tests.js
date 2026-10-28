/**
 * MediQueue Integration & End-to-End Test Suite
 * Tests authentication, token state transitions, priority queues,
 * manual override reasons, wait time uncertainty, public tracker,
 * audit history, and daily summaries.
 */

const http = require('http');
const app = require('../server/index');

let server;
let port;
let baseUrl;

// Test helper: HTTP client
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, {
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test assertion runner
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✕ FAILED: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  MediQueue Automated Test Suite');
  console.log('======================================================\n');

  // Start dedicated test server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server running on port ${port}\n`);
      resolve();
    });
  });

  try {
    // --------------------------------------------------------
    console.log('[1/8] Server Health & Static Public Endpoints');
    // --------------------------------------------------------
    const health = await request('GET', '/api/health');
    assert(health.status === 200, 'GET /api/health returns 200');
    assert(health.body.data.status === 'healthy', 'Health status is healthy');

    const indexHtml = await request('GET', '/');
    assert(indexHtml.status === 200, 'GET / serves index.html landing page with 200');
    assert(typeof indexHtml.raw === 'string' && indexHtml.raw.includes('MediQueue'), 'Landing page HTML contains MediQueue branding');

    const publicSettings = await request('GET', '/api/settings/public');
    assert(publicSettings.status === 200, 'GET /api/settings/public returns 200 without auth');
    assert(!!publicSettings.body.data.clinic_name, 'Public settings include clinic_name');

    const departments = await request('GET', '/api/departments');
    assert(departments.status === 200, 'GET /api/departments returns 200');
    assert(Array.isArray(departments.body.data) && departments.body.data.length > 0, 'Departments list is populated');
    const gmDept = departments.body.data.find(d => d.code === 'GM' || d.code === 'GEN' || d.name?.includes('General'));
    assert(!!gmDept, 'General Medicine department exists');

    // --------------------------------------------------------
    console.log('\n[2/8] Authentication, Authorization & Roles');
    // --------------------------------------------------------
    // Bad credentials
    const badLogin = await request('POST', '/api/auth/login', {
      email: 'admin@mediq.demo',
      password: 'WrongPassword123'
    });
    assert(badLogin.status === 401, 'Invalid password returns 401 Unauthorized');

    // Admin login
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@clinic.org',
      password: 'Demo@1234'
    });
    assert(adminLogin.status === 200, 'Admin login returns 200');
    assert(adminLogin.body.data.user.role === 'admin', 'Admin user role is verified');
    const adminToken = adminLogin.body.data.token;

    // Staff login
    const staffLogin = await request('POST', '/api/auth/login', {
      email: 'reception@clinic.org',
      password: 'Demo@1234'
    });
    assert(staffLogin.status === 200, 'Staff login returns 200');
    assert(staffLogin.body.data.user.role === 'staff', 'Staff user role is verified');
    const staffToken = staffLogin.body.data.token;

    // Patient login
    const patientLogin = await request('POST', '/api/auth/login', {
      email: 'patient.demo@gmail.com',
      password: 'Demo@1234'
    });
    assert(patientLogin.status === 200, 'Patient login returns 200');
    assert(patientLogin.body.data.user.role === 'patient', 'Patient user role is verified');
    const patientToken = patientLogin.body.data.token;

    // Role boundary: Patient trying to access admin-only settings
    const unauthorizedSettings = await request('GET', '/api/settings', null, patientToken);
    assert(unauthorizedSettings.status === 403, 'Patient forbidden (403) from accessing admin settings');

    // --------------------------------------------------------
    console.log('\n[3/8] Token Creation & Configurable Priority');
    // --------------------------------------------------------
    // Create standard routine token
    const normalTokenRes = await request('POST', '/api/tokens', {
      patient_name: 'Anita Verma',
      patient_phone: '+91-9988776655',
      patient_age: 32,
      patient_gender: 'Female',
      department_id: gmDept.id,
      priority: 'normal',
      notes: 'General checkup'
    }, staffToken);
    assert(normalTokenRes.status === 201, 'Staff can issue new token (201 Created)');
    assert(normalTokenRes.body.data.token_number.includes('-'), 'Token number follows department prefix (PREFIX-xxx)');
    assert(normalTokenRes.body.data.status === 'waiting', 'Initial token status is "waiting"');
    assert(typeof normalTokenRes.body.data.estimated_wait_minutes === 'number', 'Estimated wait time calculated');
    const testTokenId = normalTokenRes.body.data.id;
    const testTokenNumber = normalTokenRes.body.data.token_number;

    // Create urgent priority token with justification
    const urgentTokenRes = await request('POST', '/api/tokens', {
      patient_name: 'Suresh Kumar',
      patient_phone: '+91-9988776656',
      patient_age: 68,
      patient_gender: 'Male',
      department_id: gmDept.id,
      priority: 'urgent',
      priority_reason: 'High fever (103F) and acute respiratory discomfort'
    }, staffToken);
    assert(urgentTokenRes.status === 201, 'Staff can issue urgent token with justification');
    assert(urgentTokenRes.body.data.priority === 'urgent', 'Token priority stored as "urgent"');

    // Patient self check-in forced to normal priority
    const patientSelfRes = await request('POST', '/api/tokens', {
      patient_name: 'Rajesh Patel Self',
      department_id: gmDept.id,
      priority: 'emergency' // Attempting to self-escalate
    }, patientToken);
    assert(patientSelfRes.status === 201, 'Patient can self-register token');
    assert(patientSelfRes.body.data.priority === 'normal', 'Patient self check-in automatically normalizes priority to normal');

    // --------------------------------------------------------
    console.log('\n[4/8] Token Lifecycle & State Transitions');
    // --------------------------------------------------------
    // Get GM counters
    const countersRes = await request('GET', `/api/counters?department_id=${gmDept.id}`, null, staffToken);
    assert(countersRes.status === 200, 'Staff can retrieve counters');
    const gmCounter = (countersRes.body.data && countersRes.body.data[0]) || { id: null };

    // Transition: waiting -> called
    const callRes = await request('PATCH', `/api/tokens/${testTokenId}/status`, {
      status: 'called',
      reason: 'Announced to Counter 1',
      counter_id: gmCounter.id
    }, staffToken);
    assert(callRes.status === 200, 'Valid transition waiting -> called returns 200');
    assert(callRes.body.data.status === 'called', 'Status updated to called');

    // Transition: called -> in_consultation
    const consultRes = await request('PATCH', `/api/tokens/${testTokenId}/status`, {
      status: 'in_consultation'
    }, staffToken);
    assert(consultRes.status === 200, 'Valid transition called -> in_consultation returns 200');
    assert(consultRes.body.data.status === 'in_consultation', 'Status updated to in_consultation');

    // Invalid transition attempt: in_consultation -> waiting (must be completed or cancelled)
    const invalidTrans = await request('PATCH', `/api/tokens/${testTokenId}/status`, {
      status: 'waiting'
    }, staffToken);
    assert(invalidTrans.status === 400, 'Invalid transition in_consultation -> waiting rejected with 400');

    // Transition: in_consultation -> completed
    const completeRes = await request('PATCH', `/api/tokens/${testTokenId}/status`, {
      status: 'completed'
    }, staffToken);
    assert(completeRes.status === 200, 'Valid transition in_consultation -> completed returns 200');
    assert(completeRes.body.data.status === 'completed', 'Status updated to completed');

    // --------------------------------------------------------
    console.log('\n[5/8] Manual Override Reason Rule (Skipping & Cancelling)');
    // --------------------------------------------------------
    // Create a new token to test override rules
    const overrideToken = await request('POST', '/api/tokens', {
      patient_name: 'Test Override Patient',
      department_id: gmDept.id,
      priority: 'normal'
    }, staffToken);
    const overrideTokenId = overrideToken.body.data.id;

    // Attempting to skip WITHOUT override reason -> should fail
    const skipNoReason = await request('PATCH', `/api/tokens/${overrideTokenId}/status`, {
      status: 'skipped'
    }, staffToken);
    assert(skipNoReason.status === 400, 'Skipping token without override reason rejected with 400');

    // Attempting to cancel WITHOUT override reason -> should fail
    const cancelNoReason = await request('PATCH', `/api/tokens/${overrideTokenId}/status`, {
      status: 'cancelled'
    }, staffToken);
    assert(cancelNoReason.status === 400, 'Cancelling token without override reason rejected with 400');

    // Skipping WITH override reason -> succeeds
    const skipWithReason = await request('PATCH', `/api/tokens/${overrideTokenId}/status`, {
      status: 'skipped',
      reason: 'Patient called three times, not present at waiting hall; sent to lab'
    }, staffToken);
    assert(skipWithReason.status === 200, 'Skipping token with manual override reason returns 200');
    assert(skipWithReason.body.data.status === 'skipped', 'Status updated to skipped');
    assert(skipWithReason.body.data.override_reason.includes('Patient called three times'), 'Override reason persisted');

    // Re-queueing skipped token
    const requeueRes = await request('PATCH', `/api/tokens/${overrideTokenId}/status`, {
      status: 'waiting',
      reason: 'Patient returned from lab diagnostics'
    }, staffToken);
    assert(requeueRes.status === 200, 'Re-queueing skipped token returns 200');
    assert(requeueRes.body.data.status === 'waiting', 'Status returned to waiting');

    // --------------------------------------------------------
    console.log('\n[6/8] Public Reception Queue Board & Live Token Tracker');
    // --------------------------------------------------------
    // Public queue board
    const boardRes = await request('GET', '/api/tokens/queue');
    assert(boardRes.status === 200, 'GET /api/tokens/queue is publicly accessible (200)');
    assert(Array.isArray(boardRes.body.data.called), 'Board contains called list');
    assert(Array.isArray(boardRes.body.data.in_consultation), 'Board contains in_consultation list');
    assert(Array.isArray(boardRes.body.data.waiting), 'Board contains waiting list');

    // Public token tracker with uncertainty estimation
    const trackerRes = await request('GET', `/api/tokens/track/${testTokenNumber}`);
    assert(trackerRes.status === 200, 'GET /api/tokens/track/:tokenNumber returns 200');
    assert(trackerRes.body.data.token_number === testTokenNumber, 'Correct token tracked');
    assert(typeof trackerRes.body.data.uncertainty_delta === 'number', 'Uncertainty delta provided in response');
    assert(typeof trackerRes.body.data.estimated_min_wait === 'number', 'Minimum estimated wait bound provided');
    assert(typeof trackerRes.body.data.estimated_max_wait === 'number', 'Maximum estimated wait bound provided');
    assert(trackerRes.body.data.estimated_max_wait >= trackerRes.body.data.estimated_min_wait, 'Wait range is valid [min, max]');

    // Non-existent token track returns 404
    const notFoundTracker = await request('GET', '/api/tokens/track/NONEXISTENT-999');
    assert(notFoundTracker.status === 404, 'Tracking non-existent token returns 404');

    // --------------------------------------------------------
    console.log('\n[7/8] Audit Trail & Event History');
    // --------------------------------------------------------
    const eventsRes = await request('GET', `/api/tokens/${overrideTokenId}/events`, null, staffToken);
    assert(eventsRes.status === 200, 'GET /api/tokens/:id/events returns 200');
    assert(Array.isArray(eventsRes.body.data) && eventsRes.body.data.length >= 3, 'Audit trail records all state transitions');
    const reasons = eventsRes.body.data.map(e => e.reason).filter(Boolean);
    assert(reasons.some(r => r.includes('Patient called three times')), 'Audit history contains manual override reason');

    // --------------------------------------------------------
    console.log('\n[8/8] Analytics, Operations Dashboard & Daily Summaries');
    // --------------------------------------------------------
    // Dashboard metrics
    const dashRes = await request('GET', '/api/tokens/dashboard', null, staffToken);
    assert(dashRes.status === 200, 'GET /api/tokens/dashboard returns 200');
    assert(typeof dashRes.body.data.total_today === 'number', 'Dashboard total_today is numeric');
    assert(typeof dashRes.body.data.priority_breakdown === 'object', 'Dashboard includes priority breakdown');
    assert(typeof dashRes.body.data.hourly_distribution === 'object', 'Dashboard includes hourly distribution');

    // Generate daily summary (Admin)
    const today = new Date().toISOString().split('T')[0];
    const genSummaryRes = await request('POST', '/api/tokens/daily-summary', { date: today }, adminToken);
    assert(genSummaryRes.status === 200, 'Admin can trigger daily summary computation');
    assert(Array.isArray(genSummaryRes.body.data), 'Daily summary returns array of department summaries');

    // Read daily summaries
    const readSummariesRes = await request('GET', '/api/tokens/daily-summary', null, staffToken);
    assert(readSummariesRes.status === 200, 'Staff can read daily summaries');
    assert(readSummariesRes.body.data.length > 0, 'Daily summaries retrieved');

    console.log('\n======================================================');
    console.log(`  Tests Completed: ${passed + failed}`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Unexpected test error:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests();
