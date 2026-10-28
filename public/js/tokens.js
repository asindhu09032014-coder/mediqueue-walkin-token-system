// ============================================================
// MediQueue - Tokens & Operational Queue Coordination Module
// ============================================================

const TokensModule = {
  currentFilters: {
    status: '',
    department_id: '',
    priority: '',
    search: '',
    sort: 'created_at',
    order: 'asc'
  },
  departments: [],
  counters: [],

  async init() {
    await this.loadFormData();
    await this.fetchTokens();
  },

  async loadFormData() {
    try {
      const [deptRes, counterRes] = await Promise.all([
        API.getDepartments(),
        API.getCounters()
      ]);
      this.departments = deptRes.data || [];
      this.counters = counterRes.data || [];

      // Populate department dropdowns in filter and create modal
      const filterSelect = document.getElementById('token-dept-filter');
      const createSelect = document.getElementById('token-dept-input');

      if (filterSelect) {
        filterSelect.innerHTML = `<option value="">All Departments</option>` + 
          this.departments.map(d => `<option value="${d.id}">${d.name} (${d.code})</option>`).join('');
      }

      if (createSelect) {
        createSelect.innerHTML = `<option value="">Select Department</option>` + 
          this.departments.map(d => `<option value="${d.id}">${d.name} (${d.code}) - Avg ${d.avg_consultation_minutes}m</option>`).join('');
      }
    } catch (err) {
      console.error('Error loading token form references:', err);
    }
  },

  async fetchTokens() {
    const tbody = document.getElementById('tokens-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" class="empty-box"><span class="spinner-icon">🔄</span> Loading clinic tokens...</td></tr>`;

    try {
      const params = { ...this.currentFilters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);

      const res = await API.getTokens(params);
      const tokens = res.tokens || [];
      this.renderTokenList(tokens);
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-box" style="color: var(--color-cancelled);">Error: ${err.message}</td></tr>`;
    }
  },

  renderTokenList(tokens) {
    const tbody = document.getElementById('tokens-table-body');
    if (!tbody) return;

    if (tokens.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-box"><div class="empty-icon">📋</div>No tokens matching current filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = tokens.map(t => {
      // Estimated wait calculation with uncertainty
      let waitDisplay = '-';
      if (t.status === 'waiting') {
        const est = t.estimated_wait_minutes || 10;
        const delta = Math.max(3, Math.round(est * 0.25));
        waitDisplay = `<span style="font-weight: 600; color: var(--color-primary);">${est}m</span> <span class="uncertainty-note">(±${delta}m uncertainty)</span>`;
      } else if (t.status === 'in_consultation') {
        waitDisplay = `<span class="badge badge-in_consultation">In Room</span>`;
      } else if (t.status === 'completed') {
        waitDisplay = `<span style="color: var(--color-completed); font-weight: 600;">Waited ${t.actual_wait_minutes || 0}m</span>`;
      } else if (t.status === 'called') {
        waitDisplay = `<span class="badge badge-called">Called to Counter</span>`;
      }

      // Priority badge
      const priorityClass = t.priority === 'emergency' ? 'badge-priority-emergency' : t.priority === 'urgent' ? 'badge-priority-urgent' : 'badge-priority-normal';
      const priorityHtml = `<span class="badge ${priorityClass}">${t.priority}</span>`;

      // Status badge
      const statusHtml = `<span class="badge badge-${t.status}">${t.status.replace('_', ' ')}</span>`;

      // Operational action buttons based on status
      const actionsHtml = this.renderActionButtons(t);

      return `
        <tr>
          <td><span class="token-cell-code">${t.token_number}</span></td>
          <td>
            <div style="font-weight: 600;">${this.escapeHtml(t.patient_name)}</div>
            <div style="font-size: 0.78rem; color: var(--color-text-muted);">${t.patient_phone || 'No phone'} · ${t.patient_age ? t.patient_age + 'y' : ''} ${t.patient_gender || ''}</div>
          </td>
          <td>${t.department ? t.department.code + ' - ' + t.department.name : '-'}</td>
          <td>${priorityHtml} ${t.priority_reason ? `<div style="font-size: 0.72rem; color: var(--color-text-secondary); max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${this.escapeHtml(t.priority_reason)}">${this.escapeHtml(t.priority_reason)}</div>` : ''}</td>
          <td>${waitDisplay}</td>
          <td>${statusHtml}</td>
          <td>${t.counter ? t.counter.label : '-'}</td>
          <td>
            <div class="action-buttons-group">
              ${actionsHtml}
              <button class="btn btn-secondary btn-sm" onclick="TokensModule.viewDetails('${t.id}')" title="Audit Trail & Details">🔍</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderActionButtons(token) {
    const isStaffOrAdmin = Auth.hasRole('staff', 'admin');
    if (!isStaffOrAdmin) return '';

    let buttons = '';

    if (token.status === 'waiting') {
      buttons += `<button class="btn btn-warning btn-sm" onclick="TokensModule.promptCall('${token.id}', '${token.department_id}')">Call</button>`;
      buttons += `<button class="btn btn-secondary btn-sm" onclick="TokensModule.promptOverride('${token.id}', 'skipped')">Skip</button>`;
      buttons += `<button class="btn btn-danger btn-sm" onclick="TokensModule.promptOverride('${token.id}', 'cancelled')">Cancel</button>`;
    } else if (token.status === 'called') {
      buttons += `<button class="btn btn-primary btn-sm" onclick="TokensModule.updateStatus('${token.id}', 'in_consultation')">Consult</button>`;
      buttons += `<button class="btn btn-secondary btn-sm" onclick="TokensModule.promptOverride('${token.id}', 'skipped')">Skip</button>`;
      buttons += `<button class="btn btn-danger btn-sm" onclick="TokensModule.promptOverride('${token.id}', 'cancelled')">Cancel</button>`;
    } else if (token.status === 'in_consultation') {
      buttons += `<button class="btn btn-success btn-sm" onclick="TokensModule.updateStatus('${token.id}', 'completed')">Complete</button>`;
    } else if (token.status === 'skipped' || token.status === 'cancelled') {
      buttons += `<button class="btn btn-secondary btn-sm" onclick="TokensModule.updateStatus('${token.id}', 'waiting', 'Re-queued by staff')">Re-queue</button>`;
    }

    return buttons;
  },

  async updateStatus(tokenId, status, reason = null, counterId = null) {
    try {
      await API.updateTokenStatus(tokenId, status, reason, counterId);
      showToast(`Token status transitioned to ${status}`, 'success');
      this.fetchTokens();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  // Modal: Call Token with Counter selection
  promptCall(tokenId, deptId) {
    const deptCounters = this.counters.filter(c => c.department_id === deptId && c.is_active);
    const counterOptions = deptCounters.length > 0 
      ? deptCounters.map(c => `<option value="${c.id}">${c.label}</option>`).join('')
      : `<option value="">General Reception</option>`;

    const modalHtml = `
      <div class="modal-backdrop" id="call-modal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">Announce / Call Token</h3>
            <button class="modal-close-btn" onclick="document.getElementById('call-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Assign Service Counter / Desk</label>
              <select id="call-counter-id" class="form-control">
                ${counterOptions}
              </select>
            </div>
            <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
              Calling this token will highlight it on the Reception Waiting-Time Board with an audible chime and notify the patient to report to the selected counter.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('call-modal').remove()">Cancel</button>
            <button class="btn btn-warning" id="confirm-call-btn">Announce Now</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('confirm-call-btn').onclick = async () => {
      const counterId = document.getElementById('call-counter-id').value || null;
      document.getElementById('call-modal').remove();
      await this.updateStatus(tokenId, 'called', 'Called to service counter', counterId);
    };
  },

  // Modal: Manual Override Reason (Required for Skipping or Cancelling)
  promptOverride(tokenId, nextStatus) {
    const actionName = nextStatus === 'skipped' ? 'Skip Waiting Token' : 'Cancel Token';
    const reasonPrompt = nextStatus === 'skipped' 
      ? 'e.g., Patient stepped out for diagnostic lab / not responding to announcements'
      : 'e.g., Patient requested cancellation / duplicate entry registered';

    const modalHtml = `
      <div class="modal-backdrop" id="override-modal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">${actionName}</h3>
            <button class="modal-close-btn" onclick="document.getElementById('override-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Clinical / Administrative Override Reason <span class="req">*</span></label>
              <textarea id="override-reason-input" class="form-control" placeholder="${reasonPrompt}" required></textarea>
              <span style="font-size: 0.75rem; color: var(--color-text-muted);">A documented justification is mandatory for state audit compliance.</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('override-modal').remove()">Abort</button>
            <button class="btn btn-danger" id="confirm-override-btn">Confirm ${nextStatus}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('confirm-override-btn').onclick = async () => {
      const reason = document.getElementById('override-reason-input').value.trim();
      if (!reason) {
        showToast('Please provide a mandatory manual override justification', 'warning');
        return;
      }
      document.getElementById('override-modal').remove();
      await this.updateStatus(tokenId, nextStatus, reason);
    };
  },

  // Modal: View Token Details and Event History
  async viewDetails(tokenId) {
    try {
      const [tokenRes, eventsRes] = await Promise.all([
        API.getToken(tokenId),
        API.getTokenEvents(tokenId)
      ]);
      const t = tokenRes.data;
      const events = eventsRes.data || [];

      const modalHtml = `
        <div class="modal-backdrop" id="details-modal">
          <div class="modal-dialog" style="max-width: 640px;">
            <div class="modal-header">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="token-cell-code" style="font-size: 1.5rem;">${t.token_number}</span>
                <span class="badge badge-${t.status}">${t.status}</span>
                <span class="badge badge-priority-${t.priority}">${t.priority}</span>
              </div>
              <button class="modal-close-btn" onclick="document.getElementById('details-modal').remove()">×</button>
            </div>
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 1.5rem; font-size: 0.88rem;">
                <div><strong>Patient:</strong> ${this.escapeHtml(t.patient_name)}</div>
                <div><strong>Phone:</strong> ${t.patient_phone || 'N/A'}</div>
                <div><strong>Age / Gender:</strong> ${t.patient_age || '-'} / ${t.patient_gender || '-'}</div>
                <div><strong>Department:</strong> ${t.department ? t.department.name : '-'}</div>
                <div><strong>Counter:</strong> ${t.counter ? t.counter.label : 'Unassigned'}</div>
                <div><strong>Created:</strong> ${new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                ${t.priority_reason ? `<div style="grid-column: 1 / -1;"><strong>Priority Reason:</strong> ${this.escapeHtml(t.priority_reason)}</div>` : ''}
                ${t.override_reason ? `<div style="grid-column: 1 / -1; color: var(--color-cancelled);"><strong>Override Reason:</strong> ${this.escapeHtml(t.override_reason)}</div>` : ''}
                ${t.notes ? `<div style="grid-column: 1 / -1;"><strong>Notes:</strong> ${this.escapeHtml(t.notes)}</div>` : ''}
              </div>

              <h4 style="font-size: 0.95rem; font-weight: 700; border-bottom: 1px solid var(--color-border); padding-bottom: 6px; margin-bottom: 12px;">Chronological State Transition Audit Trail</h4>
              
              <div class="timeline-trail">
                ${events.map(ev => `
                  <div class="timeline-event-node">
                    <div class="timeline-event-time">${new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · By ${ev.changed_by_user ? ev.changed_by_user.full_name : 'System'}</div>
                    <div class="timeline-event-text">${ev.from_status ? ev.from_status : 'NEW'} ➔ <span style="text-transform: uppercase; color: var(--color-primary-dark);">${ev.to_status}</span></div>
                    ${ev.reason ? `<div class="timeline-event-reason">"${this.escapeHtml(ev.reason)}"</div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="document.getElementById('details-modal').remove()">Close</button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  // Token creation handler
  async createTokenFromForm(e) {
    e.preventDefault();
    const btn = document.getElementById('save-token-btn');
    if (btn) btn.disabled = true;

    try {
      const payload = {
        patient_name: document.getElementById('token-name-input').value.trim(),
        patient_phone: document.getElementById('token-phone-input').value.trim() || undefined,
        patient_age: parseInt(document.getElementById('token-age-input').value) || undefined,
        patient_gender: document.getElementById('token-gender-input').value || undefined,
        department_id: document.getElementById('token-dept-input').value,
        priority: document.getElementById('token-priority-input').value,
        priority_reason: document.getElementById('token-priority-reason-input').value.trim() || undefined,
        notes: document.getElementById('token-notes-input').value.trim() || undefined
      };

      const res = await API.createToken(payload);
      showToast(`Token generated successfully: ${res.data.token_number}`, 'success');
      App.closeModal('create-token-modal');
      document.getElementById('create-token-form').reset();
      this.fetchTokens();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
};
