// ============================================================
// MediQueue - Main Application Shell & Navigation Controller
// ============================================================

const App = {
  currentView: 'landing',
  currentTab: 'tokens',
  departments: [],
  counters: [],
  staffUsers: [],
  settings: {},

  async init() {
    console.log('[App] Initializing MediQueue Clinical Coordination Application...');
    
    // 1. Initialize Auth state
    Auth.init();

    // 2. Load basic references (departments, settings)
    await this.loadInitialData();

    // 3. Set up event listeners
    this.setupEventListeners();

    // 4. Handle initial routing via URL hash or default to landing
    const hash = window.location.hash.replace('#', '') || 'landing';
    this.navigate(hash);
  },

  async loadInitialData() {
    try {
      const [deptRes, pubSettingsRes] = await Promise.all([
        API.getDepartments(),
        API.getPublicSettings()
      ]);

      this.departments = deptRes.data || [];
      this.settings = pubSettingsRes.data || {};

      // Update Clinic Name in branding
      const brandElements = document.querySelectorAll('.clinic-name-text');
      brandElements.forEach(el => {
        el.textContent = this.settings.clinic_name || 'MediQueue Clinical Care';
      });

      // Update Operating Hours if visible
      const hoursEl = document.getElementById('public-clinic-hours');
      if (hoursEl && this.settings.operating_hours_start) {
        hoursEl.textContent = `${this.settings.operating_hours_start} - ${this.settings.operating_hours_end}`;
      }
    } catch (err) {
      console.warn('[App] Could not load initial public settings:', err);
    }
  },

  setupEventListeners() {
    // Hash change routing
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'landing';
      this.navigate(hash);
    });

    // Token creation form submit
    const createForm = document.getElementById('create-token-form');
    if (createForm) {
      createForm.addEventListener('submit', (e) => TokensModule.createTokenFromForm(e));
    }

    // Token search input (debounced)
    const searchInput = document.getElementById('token-search-input');
    if (searchInput) {
      let timeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          TokensModule.currentFilters.search = e.target.value.trim();
          TokensModule.fetchTokens();
        }, 300);
      });
    }

    // Token filters
    const deptFilter = document.getElementById('token-dept-filter');
    if (deptFilter) {
      deptFilter.addEventListener('change', (e) => {
        TokensModule.currentFilters.department_id = e.target.value;
        TokensModule.fetchTokens();
      });
    }

    const statusFilter = document.getElementById('token-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        TokensModule.currentFilters.status = e.target.value;
        TokensModule.fetchTokens();
      });
    }

    const priorityFilter = document.getElementById('token-priority-filter');
    if (priorityFilter) {
      priorityFilter.addEventListener('change', (e) => {
        TokensModule.currentFilters.priority = e.target.value;
        TokensModule.fetchTokens();
      });
    }

    const sortFilter = document.getElementById('token-sort-filter');
    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        TokensModule.currentFilters.sort = e.target.value;
        TokensModule.fetchTokens();
      });
    }

    // Public tracker enter key
    const trackerInput = document.getElementById('public-tracker-input');
    if (trackerInput) {
      trackerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.trackPublicToken();
        }
      });
    }

    // Board department filter
    const boardDeptSelect = document.getElementById('board-dept-filter');
    if (boardDeptSelect) {
      boardDeptSelect.addEventListener('change', (e) => {
        QueueBoard.onDeptChange(e.target.value);
      });
    }
  },

  // View Navigation: 'landing', 'board', 'app' (with tabs: 'tokens', 'dashboard', 'departments', 'settings')
  navigate(route) {
    let [view, tab] = route.split('/');
    if (!view || !['landing', 'board', 'app'].includes(view)) {
      view = 'landing';
    }

    this.currentView = view;
    if (tab) this.currentTab = tab;

    // View toggling
    document.getElementById('view-landing').classList.toggle('hidden', view !== 'landing');
    document.getElementById('view-board').classList.toggle('hidden', view !== 'board');
    document.getElementById('view-app').classList.toggle('hidden', view !== 'app');

    // Tear down board refresh if leaving board
    if (view !== 'board') {
      QueueBoard.destroy();
    }

    // Initialize specific view modules
    if (view === 'landing') {
      window.scrollTo(0, 0);
      this.loadLandingMiniQueue();
    } else if (view === 'board') {
      QueueBoard.init();
    } else if (view === 'app') {
      // Require auth to access app view
      if (!Auth.isLoggedIn()) {
        showToast('Please login to access the Staff & Admin Console', 'warning');
        this.openLoginModal();
        this.navigate('landing');
        return;
      }
      this.switchAppTab(this.currentTab || 'tokens');
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      const target = link.getAttribute('data-target');
      if (target === view) link.classList.add('active');
      else link.classList.remove('active');
    });
  },

  switchAppTab(tabName) {
    this.currentTab = tabName;

    // Update sidebar menu active classes
    document.querySelectorAll('.menu-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabName) item.classList.add('active');
      else item.classList.remove('active');
    });

    // Toggle panels
    const panels = ['tokens', 'dashboard', 'departments', 'settings'];
    panels.forEach(p => {
      const panelEl = document.getElementById(`panel-${p}`);
      if (panelEl) {
        panelEl.classList.toggle('hidden', p !== tabName);
      }
    });

    // Update topbar title
    const titles = {
      tokens: 'Token Coordination Desk',
      dashboard: 'Analytics & Daily Operations Summary',
      departments: 'Departments & Service Counters',
      settings: 'Clinic Policies & System Settings'
    };
    const titleEl = document.getElementById('topbar-page-title');
    if (titleEl) titleEl.textContent = titles[tabName] || 'Operations Console';

    // Refresh tab content
    if (tabName === 'tokens') {
      TokensModule.init();
    } else if (tabName === 'dashboard') {
      DashboardModule.init();
    } else if (tabName === 'departments') {
      this.loadDepartmentsAndCountersView();
    } else if (tabName === 'settings') {
      this.loadSettingsView();
    }
  },

  // Public Landing Page Token Tracker
  async trackPublicToken() {
    const input = document.getElementById('public-tracker-input');
    const resultBox = document.getElementById('public-tracker-result');
    if (!input || !resultBox) return;

    const tokenNumber = input.value.trim().toUpperCase();
    if (!tokenNumber) {
      showToast('Please enter your Token Number (e.g. GM-001)', 'warning');
      return;
    }

    resultBox.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: var(--color-text-secondary);">
        <span class="spinner-icon">🔄</span> Looking up token <strong>${tokenNumber}</strong>...
      </div>
    `;
    resultBox.classList.remove('hidden');

    try {
      const res = await API.trackToken(tokenNumber);
      const t = res.data;

      // Status semantics
      const statusLabels = {
        waiting: 'Waiting in Queue',
        called: 'Now Calling - Please Report to Counter',
        in_consultation: 'In Consultation Room',
        completed: 'Consultation Completed',
        skipped: 'Temporarily Skipped',
        cancelled: 'Token Cancelled'
      };

      const statusBadge = `<span class="badge badge-${t.status}" style="font-size: 0.95rem; padding: 6px 14px;">${statusLabels[t.status] || t.status}</span>`;
      
      let queueInfo = '';
      if (t.status === 'waiting') {
        queueInfo = `
          <div style="background: var(--color-primary-bg); border: 1px solid var(--color-primary-border); border-radius: var(--radius-md); padding: 1rem; margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 0.88rem; color: var(--color-text-secondary); font-weight: 600;">Queue Position</span>
              <span style="font-size: 1.15rem; font-weight: 800; color: var(--color-primary-dark);">#${t.queue_position} in line</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 0.88rem; color: var(--color-text-secondary); font-weight: 600;">Tokens Ahead of You</span>
              <span style="font-weight: 700; color: var(--color-text);">${t.tokens_ahead} patient${t.tokens_ahead === 1 ? '' : 's'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--color-primary-border); padding-top: 8px;">
              <span style="font-size: 0.88rem; color: var(--color-text-secondary); font-weight: 600;">Estimated Wait Window</span>
              <div style="text-align: right;">
                <span style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary);">${t.estimated_min_wait} - ${t.estimated_max_wait} mins</span>
                <div class="uncertainty-note">(approx. ${t.estimated_wait_minutes}m ±${t.uncertainty_delta}m)</div>
              </div>
            </div>
          </div>
        `;
      } else if (t.status === 'called') {
        queueInfo = `
          <div style="background: var(--color-called-bg); border: 2px solid var(--color-called); border-radius: var(--radius-md); padding: 1.25rem; margin-top: 1rem; text-align: center;">
            <div style="font-size: 0.9rem; text-transform: uppercase; font-weight: 700; color: var(--color-called); letter-spacing: 0.05em;">Your Turn!</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--color-text); margin: 6px 0;">Please proceed immediately to:</div>
            <div style="font-size: 1.6rem; font-weight: 900; color: var(--color-called);">${t.counter ? t.counter.label : 'Main Reception Desk'}</div>
          </div>
        `;
      } else if (t.status === 'in_consultation') {
        queueInfo = `
          <div style="background: var(--color-consultation-bg); border: 1px solid #c4b5fd; border-radius: var(--radius-md); padding: 1rem; margin-top: 1rem; text-align: center;">
            <span style="font-weight: 700; color: var(--color-consultation);">Consultation currently active with physician at ${t.counter ? t.counter.label : 'Desk'}.</span>
          </div>
        `;
      } else if (t.status === 'completed') {
        queueInfo = `
          <div style="background: var(--color-completed-bg); border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 1rem; margin-top: 1rem; text-align: center;">
            <span style="font-weight: 700; color: var(--color-completed);">✓ Visit completed. Total wait was ${t.actual_wait_minutes || 0} minutes.</span>
          </div>
        `;
      } else if (t.status === 'skipped') {
        queueInfo = `
          <div style="background: var(--color-skipped-bg); border: 1px solid #fde047; border-radius: var(--radius-md); padding: 1rem; margin-top: 1rem;">
            <div style="font-weight: 700; color: #854d0e;">Notice: Your token was temporarily skipped.</div>
            <div style="font-size: 0.85rem; margin-top: 4px; color: var(--color-text-secondary);">${t.override_reason || 'Please check in with the reception desk to be re-queued.'}</div>
          </div>
        `;
      }

      resultBox.innerHTML = `
        <div style="border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.5rem; background: var(--color-surface); box-shadow: var(--shadow-md);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted);">Live Token Status</div>
              <span class="token-cell-code" style="font-size: 2rem; display: inline-block; margin-top: 4px;">${t.token_number}</span>
            </div>
            <div>${statusBadge}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.88rem; padding: 10px 0; border-top: 1px solid var(--color-border-light); border-bottom: 1px solid var(--color-border-light);">
            <div><strong>Patient:</strong> ${QueueBoard.maskPatientName(t.patient_name)}</div>
            <div><strong>Department:</strong> ${t.department ? t.department.name : '-'}</div>
            <div><strong>Registration:</strong> ${new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>Assigned Desk:</strong> ${t.counter ? t.counter.label : 'Triage / Reception'}</div>
          </div>

          ${queueInfo}

          <div style="margin-top: 12px; text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="App.trackPublicToken()">↻ Refresh Status</button>
          </div>
        </div>
      `;
    } catch (err) {
      resultBox.innerHTML = `
        <div style="padding: 1.25rem; border: 1px solid #fecaca; border-radius: var(--radius-md); background: #fef2f2; color: var(--color-cancelled); font-size: 0.9rem;">
          <strong>Lookup Failed:</strong> ${err.message}
        </div>
      `;
    }
  },

  // Mini live queue preview for landing page
  async loadLandingMiniQueue() {
    const container = document.getElementById('landing-preview-board');
    if (!container) return;

    try {
      const res = await API.getPublicQueue();
      const q = res.data;

      const calledHtml = q.called.slice(0, 3).map(t => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-sm); margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="token-cell-code" style="font-size: 1rem;">${t.token_number}</span>
            <span style="font-size: 0.85rem; font-weight: 600;">${QueueBoard.maskPatientName(t.patient_name)}</span>
          </div>
          <span class="badge badge-called" style="font-size: 0.75rem;">➔ ${t.counter ? t.counter.label : 'Reception'}</span>
        </div>
      `).join('') || '<div style="color: var(--color-text-muted); font-size: 0.85rem; padding: 8px 0;">No active calls right now</div>';

      const waitingHtml = q.waiting.slice(0, 4).map(t => {
        const est = t.estimated_wait_minutes || 10;
        const delta = Math.max(3, Math.round(est * 0.25));
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--color-surface); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="token-cell-code" style="font-size: 0.9rem;">${t.token_number}</span>
              <span style="font-size: 0.82rem;">${QueueBoard.maskPatientName(t.patient_name)}</span>
            </div>
            <span style="font-size: 0.82rem; font-weight: 600; color: var(--color-primary);">${est}m <span class="uncertainty-note">(±${delta}m)</span></span>
          </div>
        `;
      }).join('') || '<div style="color: var(--color-text-muted); font-size: 0.85rem; padding: 8px 0;">Queue empty</div>';

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--color-called); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <span class="live-pulse" style="width: 8px; height: 8px;"></span> Now Calling
            </div>
            ${calledHtml}
          </div>
          <div>
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--color-primary); margin-bottom: 8px;">
              Next in Line (${q.total_waiting} total)
            </div>
            ${waitingHtml}
          </div>
        </div>
      `;
    } catch (err) {
      console.warn('Failed to load landing mini queue:', err);
    }
  },

  // Modal Handlers
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
    }
  },

  openLoginModal() {
    this.openModal('login-modal');
  },

  openCreateTokenModal() {
    if (!Auth.isLoggedIn()) {
      showToast('Please login to issue a walk-in token', 'warning');
      this.openLoginModal();
      return;
    }
    this.openModal('create-token-modal');
  },

  // 1-Click Quick Demo Login (for evaluators)
  async demoLogin(role) {
    const demoAccounts = {
      admin: { email: 'admin@clinic.org', password: 'Demo@1234' },
      staff: { email: 'reception@clinic.org', password: 'Demo@1234' },
      doctor: { email: 'doctor.jenkins@clinic.org', password: 'Demo@1234' },
      patient: { email: 'patient.demo@gmail.com', password: 'Demo@1234' }
    };

    const creds = demoAccounts[role];
    if (!creds) return;

    try {
      await Auth.login(creds.email, creds.password);
      this.closeModal('login-modal');
      this.navigate('app/tokens');
    } catch (err) {
      console.error('Demo login error:', err);
    }
  },

  // Custom login form submit
  async submitLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email-input').value.trim();
    const password = document.getElementById('login-password-input').value;
    const btn = document.getElementById('login-submit-btn');

    if (btn) btn.disabled = true;

    try {
      await Auth.login(email, password);
      this.closeModal('login-modal');
      this.navigate('app/tokens');
    } catch (err) {
      // toast shown in Auth.login
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  // Departments & Counters Management View
  async loadDepartmentsAndCountersView() {
    const deptsContainer = document.getElementById('depts-list-container');
    const countersContainer = document.getElementById('counters-list-container');
    if (!deptsContainer || !countersContainer) return;

    deptsContainer.innerHTML = '<div class="empty-box"><span class="spinner-icon">🔄</span> Loading departments...</div>';
    countersContainer.innerHTML = '<div class="empty-box"><span class="spinner-icon">🔄</span> Loading counters...</div>';

    try {
      const [deptRes, counterRes, staffRes] = await Promise.all([
        API.getDepartments(),
        API.getCounters(),
        Auth.hasRole('admin', 'staff') ? API.getStaffUsers() : Promise.resolve({ data: [] })
      ]);

      this.departments = deptRes.data || [];
      this.counters = counterRes.data || [];
      this.staffUsers = staffRes.data || [];

      // Render Departments
      deptsContainer.innerHTML = `
        <div class="table-responsive">
          <table class="token-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Department Name</th>
                <th>Avg Consultation</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${this.departments.map(d => `
                <tr>
                  <td><span class="token-cell-code">${d.code}</span></td>
                  <td><strong>${d.name}</strong></td>
                  <td>${d.avg_consultation_minutes} mins</td>
                  <td style="color: var(--color-text-secondary); font-size: 0.85rem;">${d.description || '-'}</td>
                  <td><span class="badge ${d.is_active ? 'badge-completed' : 'badge-cancelled'}">${d.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Render Counters
      const isAdmin = Auth.hasRole('admin');
      countersContainer.innerHTML = `
        <div class="table-responsive">
          <table class="token-table">
            <thead>
              <tr>
                <th>Desk / Counter</th>
                <th>Department</th>
                <th>Assigned Staff</th>
                <th>Status</th>
                ${isAdmin ? '<th>Action</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${this.counters.map(c => `
                <tr>
                  <td><strong>${c.label}</strong> (Desk #${c.counter_number})</td>
                  <td>${c.department ? c.department.name : '-'}</td>
                  <td>
                    ${isAdmin ? `
                      <select class="form-control" style="font-size: 0.85rem; padding: 4px 8px; max-width: 200px;" onchange="App.assignCounterStaff('${c.id}', this.value)">
                        <option value="">-- Unassigned --</option>
                        ${this.staffUsers.map(s => `
                          <option value="${s.id}" ${c.assigned_staff_id === s.id ? 'selected' : ''}>${s.full_name} (${s.role})</option>
                        `).join('')}
                      </select>
                    ` : (c.staff ? c.staff.full_name : '<span style="color: var(--color-text-muted);">Unassigned</span>')}
                  </td>
                  <td>
                    <span class="badge ${c.is_active ? 'badge-completed' : 'badge-cancelled'}">${c.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  ${isAdmin ? `
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="App.toggleCounterActive('${c.id}', ${!c.is_active})">
                        ${c.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  ` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      deptsContainer.innerHTML = `<div class="empty-box" style="color: var(--color-cancelled);">Error: ${err.message}</div>`;
    }
  },

  async assignCounterStaff(counterId, staffId) {
    try {
      await API.assignCounterStaff(counterId, staffId || null);
      showToast('Counter staff assignment updated', 'success');
      this.loadDepartmentsAndCountersView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async toggleCounterActive(counterId, isActive) {
    try {
      await API.request(`/counters/${counterId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive })
      });
      showToast(`Counter ${isActive ? 'enabled' : 'disabled'}`, 'success');
      this.loadDepartmentsAndCountersView();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  // Settings Panel
  async loadSettingsView() {
    const container = document.getElementById('settings-list-container');
    if (!container) return;

    container.innerHTML = '<div class="empty-box"><span class="spinner-icon">🔄</span> Loading system settings...</div>';

    try {
      const res = await API.getAllSettings();
      const settings = res.data || [];

      container.innerHTML = `
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Clinic Operational Configuration</h3>
          </div>
          <div class="panel-body">
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${settings.map(s => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--color-bg); border-radius: var(--radius-md); border: 1px solid var(--color-border-light);">
                  <div style="flex: 1; padding-right: 16px;">
                    <div style="font-weight: 700; font-family: var(--font-mono); font-size: 0.9rem; color: var(--color-primary-dark);">${s.setting_key}</div>
                    <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 2px;">${s.description || ''}</div>
                  </div>
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" id="setting-val-${s.setting_key}" value="${s.setting_value}" class="form-control" style="width: 220px;">
                    <button class="btn btn-primary btn-sm" onclick="App.saveSetting('${s.setting_key}')">Save</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-box" style="color: var(--color-cancelled);">Error: ${err.message}</div>`;
    }
  },

  async saveSetting(key) {
    const input = document.getElementById(`setting-val-${key}`);
    if (!input) return;
    const value = input.value.trim();

    try {
      await API.updateSetting(key, value);
      showToast(`Setting ${key} updated successfully`, 'success');
      this.loadInitialData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
