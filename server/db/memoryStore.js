const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function createMemoryClient() {
  const defaultPasswordHash = bcrypt.hashSync('Demo@1234', 10);
  const today = new Date().toISOString().split('T')[0];

  // In-memory collections
  const data = {
    users: [
      { id: '11111111-1111-4111-a111-111111111111', email: 'admin@mediq.demo', password_hash: defaultPasswordHash, full_name: 'Dr. Priya Sharma (Admin)', role: 'admin', phone: '+91-9876543210', is_active: true, created_at: new Date(Date.now() - 86400000 * 30).toISOString(), updated_at: new Date().toISOString() },
      { id: '22222222-2222-4222-a222-222222222222', email: 'reception1@mediq.demo', password_hash: defaultPasswordHash, full_name: 'Anita Desai (Reception)', role: 'staff', phone: '+91-9876543211', is_active: true, created_at: new Date(Date.now() - 86400000 * 20).toISOString(), updated_at: new Date().toISOString() },
      { id: '33333333-3333-4333-a333-333333333333', email: 'reception2@mediq.demo', password_hash: defaultPasswordHash, full_name: 'Ravi Kumar (Staff)', role: 'staff', phone: '+91-9876543212', is_active: true, created_at: new Date(Date.now() - 86400000 * 15).toISOString(), updated_at: new Date().toISOString() },
      { id: '44444444-4444-4444-a444-444444444444', email: 'doctor.gm@mediq.demo', password_hash: defaultPasswordHash, full_name: 'Dr. Arun Mehta (Physician)', role: 'staff', phone: '+91-9876543213', is_active: true, created_at: new Date(Date.now() - 86400000 * 10).toISOString(), updated_at: new Date().toISOString() },
      { id: '55555555-5555-4555-a555-555555555555', email: 'patient1@demo.test', password_hash: defaultPasswordHash, full_name: 'Rajesh Patel', role: 'patient', phone: '+91-9876543220', is_active: true, created_at: new Date(Date.now() - 86400000 * 5).toISOString(), updated_at: new Date().toISOString() },
      { id: '66666666-6666-4666-a666-666666666666', email: 'patient2@demo.test', password_hash: defaultPasswordHash, full_name: 'Meena Gupta', role: 'patient', phone: '+91-9876543221', is_active: true, created_at: new Date(Date.now() - 86400000 * 2).toISOString(), updated_at: new Date().toISOString() }
    ],
    departments: [
      { id: 'd1111111-1111-4111-a111-111111111111', name: 'General Medicine', code: 'GM', description: 'General adult outpatient consultations, fevers, and check-ups', avg_consultation_minutes: 12, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'd2222222-2222-4222-a222-222222222222', name: 'Pediatrics', code: 'PD', description: 'Children, infant wellness, and adolescent pediatric care', avg_consultation_minutes: 15, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'd3333333-3333-4333-a333-333333333333', name: 'Orthopedics', code: 'OR', description: 'Bone, joint, spinal issues, and musculoskeletal injuries', avg_consultation_minutes: 18, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'd4444444-4444-4444-a444-444444444444', name: 'Dermatology', code: 'DM', description: 'Skin disorders, allergies, and dermatological procedures', avg_consultation_minutes: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'd5555555-5555-4555-a555-555555555555', name: 'ENT Clinic', code: 'EN', description: 'Ear, nose, throat diagnostics and audiometry', avg_consultation_minutes: 14, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ],
    counters: [
      { id: 'c1111111-1111-4111-a111-111111111111', department_id: 'd1111111-1111-4111-a111-111111111111', counter_number: 1, label: 'GM Counter 1', assigned_staff_id: '44444444-4444-4444-a444-444444444444', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'c2222222-2222-4222-a222-222222222222', department_id: 'd1111111-1111-4111-a111-111111111111', counter_number: 2, label: 'GM Counter 2', assigned_staff_id: null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'c3333333-3333-4333-a333-333333333333', department_id: 'd2222222-2222-4222-a222-222222222222', counter_number: 1, label: 'PD Counter 1', assigned_staff_id: null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'c4444444-4444-4444-a444-444444444444', department_id: 'd3333333-3333-4333-a333-333333333333', counter_number: 1, label: 'OR Counter 1', assigned_staff_id: null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ],
    system_settings: [
      { id: uuidv4(), setting_key: 'clinic_name', setting_value: 'MediQueue Clinical Care', description: 'Name of the medical clinic', updated_at: new Date().toISOString() },
      { id: uuidv4(), setting_key: 'max_tokens_per_day', setting_value: '250', description: 'Maximum tokens allowed daily', updated_at: new Date().toISOString() },
      { id: uuidv4(), setting_key: 'default_consultation_minutes', setting_value: '15', description: 'Default expected consultation time', updated_at: new Date().toISOString() },
      { id: uuidv4(), setting_key: 'operating_hours_start', setting_value: '08:00', description: 'Morning clinic start time', updated_at: new Date().toISOString() },
      { id: uuidv4(), setting_key: 'operating_hours_end', setting_value: '20:00', description: 'Evening clinic close time', updated_at: new Date().toISOString() },
      { id: uuidv4(), setting_key: 'display_board_refresh_seconds', setting_value: '10', description: 'Queue display board refresh interval in seconds', updated_at: new Date().toISOString() }
    ],
    tokens: [
      {
        id: 't001-0000-0000-0000-000000000001',
        token_number: 'GM-001',
        token_date: today,
        patient_name: 'Arjun Reddy',
        patient_phone: '+91-9811002233',
        patient_age: 38,
        patient_gender: 'Male',
        department_id: 'd1111111-1111-4111-a111-111111111111',
        counter_id: 'c1111111-1111-4111-a111-111111111111',
        status: 'completed',
        priority: 'normal',
        priority_reason: null,
        override_reason: null,
        created_by: '22222222-2222-4222-a222-222222222222',
        called_by: '44444444-4444-4444-a444-444444444444',
        called_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        consultation_started_at: new Date(Date.now() - 3600000 * 2 + 120000).toISOString(),
        completed_at: new Date(Date.now() - 3600000 * 2 + 900000).toISOString(),
        estimated_wait_minutes: 10,
        actual_wait_minutes: 12,
        notes: 'Routine health checkup',
        created_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 2 + 900000).toISOString()
      },
      {
        id: 't002-0000-0000-0000-000000000002',
        token_number: 'GM-002',
        token_date: today,
        patient_name: 'Sunita Sharma',
        patient_phone: '+91-9822113344',
        patient_age: 52,
        patient_gender: 'Female',
        department_id: 'd1111111-1111-4111-a111-111111111111',
        counter_id: 'c1111111-1111-4111-a111-111111111111',
        status: 'in_consultation',
        priority: 'urgent',
        priority_reason: 'Severe migraine with elevated BP (150/95)',
        override_reason: 'Prioritized due to acute headache symptoms',
        created_by: '22222222-2222-4222-a222-222222222222',
        called_by: '44444444-4444-4444-a444-444444444444',
        called_at: new Date(Date.now() - 600000).toISOString(),
        consultation_started_at: new Date(Date.now() - 480000).toISOString(),
        completed_at: null,
        estimated_wait_minutes: 8,
        actual_wait_minutes: 9,
        notes: 'Requested quiet room',
        created_at: new Date(Date.now() - 1800000).toISOString(),
        updated_at: new Date(Date.now() - 480000).toISOString()
      },
      {
        id: 't003-0000-0000-0000-000000000003',
        token_number: 'GM-003',
        token_date: today,
        patient_name: 'Rohan Mehra',
        patient_phone: '+91-9833224455',
        patient_age: 26,
        patient_gender: 'Male',
        department_id: 'd1111111-1111-4111-a111-111111111111',
        counter_id: 'c1111111-1111-4111-a111-111111111111',
        status: 'called',
        priority: 'normal',
        priority_reason: null,
        override_reason: null,
        created_by: '22222222-2222-4222-a222-222222222222',
        called_by: '44444444-4444-4444-a444-444444444444',
        called_at: new Date(Date.now() - 120000).toISOString(),
        consultation_started_at: null,
        completed_at: null,
        estimated_wait_minutes: 18,
        actual_wait_minutes: null,
        notes: null,
        created_at: new Date(Date.now() - 1200000).toISOString(),
        updated_at: new Date(Date.now() - 120000).toISOString()
      },
      {
        id: 't004-0000-0000-0000-000000000004',
        token_number: 'GM-004',
        token_date: today,
        patient_name: 'Devendra Joshi',
        patient_phone: '+91-9844335566',
        patient_age: 69,
        patient_gender: 'Male',
        department_id: 'd1111111-1111-4111-a111-111111111111',
        counter_id: null,
        status: 'waiting',
        priority: 'urgent',
        priority_reason: 'Elderly patient with mild shortness of breath',
        override_reason: null,
        created_by: '22222222-2222-4222-a222-222222222222',
        called_by: null,
        called_at: null,
        consultation_started_at: null,
        completed_at: null,
        estimated_wait_minutes: 14,
        actual_wait_minutes: null,
        notes: 'Wheelchair assistance provided',
        created_at: new Date(Date.now() - 900000).toISOString(),
        updated_at: new Date(Date.now() - 900000).toISOString()
      },
      {
        id: 't005-0000-0000-0000-000000000005',
        token_number: 'GM-005',
        token_date: today,
        patient_name: 'Amina Khatun',
        patient_phone: '+91-9855446677',
        patient_age: 31,
        patient_gender: 'Female',
        department_id: 'd1111111-1111-4111-a111-111111111111',
        counter_id: null,
        status: 'waiting',
        priority: 'normal',
        priority_reason: null,
        override_reason: null,
        created_by: '22222222-2222-4222-a222-222222222222',
        called_by: null,
        called_at: null,
        consultation_started_at: null,
        completed_at: null,
        estimated_wait_minutes: 26,
        actual_wait_minutes: null,
        notes: null,
        created_at: new Date(Date.now() - 600000).toISOString(),
        updated_at: new Date(Date.now() - 600000).toISOString()
      },
      {
        id: 't006-0000-0000-0000-000000000006',
        token_number: 'GM-006',
        token_date: today,
        patient_name: 'Vikram Choudhury',
        patient_phone: '+91-9866557788',
        patient_age: 44,
        patient_gender: 'Male',
        department_id: 'd1111111-1111-4111-a111-111111111111',
        counter_id: null,
        status: 'skipped',
        priority: 'normal',
        priority_reason: null,
        override_reason: 'Patient briefly stepped away to pharmacy; moved to skipped queue',
        created_by: '22222222-2222-4222-a222-222222222222',
        called_by: null,
        called_at: null,
        consultation_started_at: null,
        completed_at: null,
        estimated_wait_minutes: 32,
        actual_wait_minutes: null,
        notes: null,
        created_at: new Date(Date.now() - 1500000).toISOString(),
        updated_at: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: 't007-0000-0000-0000-000000000007',
        token_number: 'OR-001',
        token_date: today,
        patient_name: 'Suresh Iyer',
        patient_phone: '+91-9877668899',
        patient_age: 62,
        patient_gender: 'Male',
        department_id: 'd3333333-3333-4333-a333-333333333333',
        counter_id: null,
        status: 'waiting',
        priority: 'emergency',
        priority_reason: 'Suspected wrist fracture following outdoor slip',
        override_reason: 'Emergency triage bump to top of queue',
        created_by: '22222222-2222-4222-a222-222222222222',
        called_by: null,
        called_at: null,
        consultation_started_at: null,
        completed_at: null,
        estimated_wait_minutes: 4,
        actual_wait_minutes: null,
        notes: 'X-Ray order requested upon arrival',
        created_at: new Date(Date.now() - 400000).toISOString(),
        updated_at: new Date(Date.now() - 400000).toISOString()
      },
      {
        id: 't008-0000-0000-0000-000000000008',
        token_number: 'PD-001',
        token_date: today,
        patient_name: 'Baby Anvi (Guard. Ritu)',
        patient_phone: '+91-9888779900',
        patient_age: 4,
        patient_gender: 'Female',
        department_id: 'd2222222-2222-4222-a222-222222222222',
        counter_id: null,
        status: 'waiting',
        priority: 'normal',
        priority_reason: null,
        override_reason: null,
        created_by: '22222222-2222-4222-a222-222222222222',
        called_by: null,
        called_at: null,
        consultation_started_at: null,
        completed_at: null,
        estimated_wait_minutes: 15,
        actual_wait_minutes: null,
        notes: 'Scheduled booster vaccine query',
        created_at: new Date(Date.now() - 500000).toISOString(),
        updated_at: new Date(Date.now() - 500000).toISOString()
      }
    ],
    token_events: [
      { id: uuidv4(), token_id: 't001-0000-0000-0000-000000000001', from_status: null, to_status: 'waiting', changed_by: '22222222-2222-4222-a222-222222222222', reason: 'Token issued at reception desk', metadata: {}, created_at: new Date(Date.now() - 7200000).toISOString() },
      { id: uuidv4(), token_id: 't001-0000-0000-0000-000000000001', from_status: 'waiting', to_status: 'called', changed_by: '44444444-4444-4444-a444-444444444444', reason: 'Announced on public display board', metadata: { counter_id: 'c1111111-1111-4111-a111-111111111111' }, created_at: new Date(Date.now() - 7000000).toISOString() },
      { id: uuidv4(), token_id: 't001-0000-0000-0000-000000000001', from_status: 'called', to_status: 'in_consultation', changed_by: '44444444-4444-4444-a444-444444444444', reason: 'Doctor initiated consultation', metadata: {}, created_at: new Date(Date.now() - 6800000).toISOString() },
      { id: uuidv4(), token_id: 't001-0000-0000-0000-000000000001', from_status: 'in_consultation', to_status: 'completed', changed_by: '44444444-4444-4444-a444-444444444444', reason: 'Consultation concluded with prescription', metadata: {}, created_at: new Date(Date.now() - 6000000).toISOString() },
      { id: uuidv4(), token_id: 't002-0000-0000-0000-000000000002', from_status: null, to_status: 'waiting', changed_by: '22222222-2222-4222-a222-222222222222', reason: 'Urgent token generated', metadata: {}, created_at: new Date(Date.now() - 1800000).toISOString() },
      { id: uuidv4(), token_id: 't002-0000-0000-0000-000000000002', from_status: 'waiting', to_status: 'called', changed_by: '44444444-4444-4444-a444-444444444444', reason: 'Called into GM Counter 1', metadata: { counter_id: 'c1111111-1111-4111-a111-111111111111' }, created_at: new Date(Date.now() - 600000).toISOString() },
      { id: uuidv4(), token_id: 't002-0000-0000-0000-000000000002', from_status: 'called', to_status: 'in_consultation', changed_by: '44444444-4444-4444-a444-444444444444', reason: 'Patient entered examination area', metadata: {}, created_at: new Date(Date.now() - 480000).toISOString() }
    ],
    daily_summaries: [
      {
        id: uuidv4(),
        summary_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        department_id: 'd1111111-1111-4111-a111-111111111111',
        total_tokens: 42,
        completed_tokens: 38,
        skipped_tokens: 3,
        cancelled_tokens: 1,
        avg_wait_minutes: 13.5,
        max_wait_minutes: 27,
        min_wait_minutes: 4,
        avg_consultation_minutes: 11.8,
        peak_hour: 10,
        peak_hour_count: 9,
        generated_at: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  };

  // Helper to expand foreign keys
  function populateItem(tableName, item) {
    if (!item) return null;
    const cloned = { ...item };
    if (tableName === 'tokens') {
      cloned.department = data.departments.find(d => d.id === cloned.department_id) || null;
      cloned.counter = data.counters.find(c => c.id === cloned.counter_id) || null;
      cloned.creator = data.users.find(u => u.id === cloned.created_by) ? { id: cloned.created_by, full_name: data.users.find(u => u.id === cloned.created_by).full_name } : null;
      cloned.caller = data.users.find(u => u.id === cloned.called_by) ? { id: cloned.called_by, full_name: data.users.find(u => u.id === cloned.called_by).full_name } : null;
    } else if (tableName === 'counters') {
      cloned.department = data.departments.find(d => d.id === cloned.department_id) || null;
      const staffUser = data.users.find(u => u.id === cloned.assigned_staff_id);
      cloned.staff = staffUser ? { id: staffUser.id, full_name: staffUser.full_name, email: staffUser.email } : null;
    } else if (tableName === 'token_events') {
      const u = data.users.find(user => user.id === cloned.changed_by);
      cloned.changed_by_user = u ? { id: u.id, full_name: u.full_name, role: u.role } : null;
    } else if (tableName === 'daily_summaries') {
      cloned.department = data.departments.find(d => d.id === cloned.department_id) || null;
    } else if (tableName === 'departments') {
      cloned.counters = data.counters.filter(c => c.department_id === cloned.id);
    }
    return cloned;
  }

  // Chainable query builder
  class QueryBuilder {
    constructor(tableName) {
      this.table = tableName;
      this.filters = [];
      this.selectFields = '*';
      this.isHead = false;
      this.isExactCount = false;
      this.sortRules = [];
      this.rangeOffset = 0;
      this.rangeLimit = null;
      this.isSingle = false;
      this.insertData = null;
      this.updateData = null;
      this.upsertData = null;
      this.upsertOptions = null;
      this.isDelete = false;
    }

    select(fields = '*', options = {}) {
      this.selectFields = fields;
      if (options.count === 'exact') this.isExactCount = true;
      if (options.head) this.isHead = true;
      return this;
    }

    eq(field, val) {
      this.filters.push(item => item[field] === val);
      return this;
    }

    neq(field, val) {
      this.filters.push(item => item[field] !== val);
      return this;
    }

    in(field, values) {
      this.filters.push(item => values.includes(item[field]));
      return this;
    }

    like(field, pattern) {
      const regex = new RegExp('^' + pattern.replace(/%/g, '.*') + '$', 'i');
      this.filters.push(item => regex.test(item[field] || ''));
      return this;
    }

    ilike(field, pattern) {
      return this.like(field, pattern);
    }

    or(filterExpr) {
      // E.g.: "patient_name.ilike.%search%,token_number.ilike.%search%"
      const parts = filterExpr.split(',');
      this.filters.push(item => {
        return parts.some(part => {
          const match = part.match(/^([^.]+)\.ilike\.(.*)$/);
          if (match) {
            const [, col, pat] = match;
            const regex = new RegExp(pat.replace(/%/g, '.*'), 'i');
            return regex.test(item[col] || '');
          }
          return false;
        });
      });
      return this;
    }

    gte(field, val) {
      this.filters.push(item => item[field] >= val);
      return this;
    }

    lte(field, val) {
      this.filters.push(item => item[field] <= val);
      return this;
    }

    order(field, { ascending = true } = {}) {
      this.sortRules.push({ field, ascending });
      return this;
    }

    range(from, to) {
      this.rangeOffset = from;
      this.rangeLimit = to - from + 1;
      return this;
    }

    limit(num) {
      this.rangeLimit = num;
      return this;
    }

    single() {
      this.isSingle = true;
      return this;
    }

    insert(records) {
      this.insertData = Array.isArray(records) ? records : [records];
      return this;
    }

    upsert(records, options = {}) {
      this.upsertData = Array.isArray(records) ? records : [records];
      this.upsertOptions = options;
      return this;
    }

    update(fields) {
      this.updateData = fields;
      return this;
    }

    delete() {
      this.isDelete = true;
      return this;
    }

    // Execution resolution (Promise)
    then(resolve, reject) {
      try {
        if (!data[this.table]) {
          data[this.table] = [];
        }
        let list = data[this.table];

        // 1. DELETE
        if (this.isDelete) {
          const filtered = list.filter(item => this.filters.every(fn => fn(item)));
          data[this.table] = list.filter(item => !this.filters.every(fn => fn(item)));
          return resolve({ data: filtered, error: null });
        }

        // 2. INSERT
        if (this.insertData) {
          const inserted = this.insertData.map(item => {
            const newItem = {
              id: item.id || uuidv4(),
              ...item,
              created_at: item.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            list.push(newItem);
            return populateItem(this.table, newItem);
          });
          const result = this.isSingle ? inserted[0] : inserted;
          return resolve({ data: result, error: null });
        }

        // 3. UPSERT
        if (this.upsertData) {
          const onConflict = (this.upsertOptions && this.upsertOptions.onConflict) || 'id';
          const conflictKeys = onConflict.split(',').map(s => s.trim());
          const affected = this.upsertData.map(item => {
            const existingIdx = list.findIndex(existing => 
              conflictKeys.every(k => existing[k] === item[k])
            );
            if (existingIdx >= 0) {
              list[existingIdx] = {
                ...list[existingIdx],
                ...item,
                updated_at: new Date().toISOString()
              };
              return populateItem(this.table, list[existingIdx]);
            } else {
              const newItem = {
                id: item.id || uuidv4(),
                ...item,
                created_at: item.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              list.push(newItem);
              return populateItem(this.table, newItem);
            }
          });
          const result = this.isSingle ? affected[0] : affected;
          return resolve({ data: result, error: null });
        }

        // 4. UPDATE
        if (this.updateData) {
          const matching = list.filter(item => this.filters.every(fn => fn(item)));
          const updated = matching.map(item => {
            Object.assign(item, this.updateData, { updated_at: new Date().toISOString() });
            return populateItem(this.table, item);
          });
          const result = this.isSingle ? (updated[0] || null) : updated;
          return resolve({ data: result, error: null });
        }

        // 5. QUERY / SELECT
        let result = list.filter(item => this.filters.every(fn => fn(item)));
        const totalCount = result.length;

        // Apply sorting
        if (this.sortRules.length > 0) {
          result.sort((a, b) => {
            for (const { field, ascending } of this.sortRules) {
              let valA = a[field];
              let valB = b[field];
              if (field === 'priority') {
                const priorityWeight = { emergency: 1, urgent: 2, normal: 3 };
                valA = priorityWeight[valA] || 9;
                valB = priorityWeight[valB] || 9;
              }
              if (valA < valB) return ascending ? -1 : 1;
              if (valA > valB) return ascending ? 1 : -1;
            }
            return 0;
          });
        }

        // Apply pagination
        if (this.rangeOffset > 0 || this.rangeLimit !== null) {
          const start = this.rangeOffset || 0;
          const end = this.rangeLimit ? start + this.rangeLimit : undefined;
          result = result.slice(start, end);
        }

        // Populate relationships
        result = result.map(item => populateItem(this.table, item));

        if (this.isHead) {
          return resolve({ data: null, count: totalCount, error: null });
        }

        if (this.isSingle) {
          return resolve({ data: result[0] || null, error: result[0] ? null : { message: 'Row not found' } });
        }

        return resolve({ data: result, count: totalCount, error: null });
      } catch (err) {
        return reject(err);
      }
    }
  }

  return {
    from(table) {
      return new QueryBuilder(table);
    },
    rpc(fnName, params) {
      return Promise.resolve({ data: null, error: null });
    }
  };
}

module.exports = createMemoryClient;
