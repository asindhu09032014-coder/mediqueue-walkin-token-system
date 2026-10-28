// ============================================================
// MediQueue - Public Reception Queue Board Module
// ============================================================

const QueueBoard = {
  refreshTimer: null,
  activeDeptId: '',
  lastCalledIds: new Set(),

  init() {
    this.startClock();
    this.loadDepartments();
    this.fetchQueue();
    
    // Auto-refresh interval
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => {
      if (document.getElementById('view-board') && !document.getElementById('view-board').classList.contains('hidden')) {
        this.fetchQueue();
      }
    }, 10000);
  },

  destroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  },

  startClock() {
    const clockEl = document.getElementById('board-live-clock');
    const updateTime = () => {
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  },

  async loadDepartments() {
    const selector = document.getElementById('board-dept-filter');
    if (!selector) return;

    try {
      const res = await API.getDepartments();
      const depts = res.data || [];
      selector.innerHTML = `<option value="">All Clinical Departments</option>` + 
        depts.map(d => `<option value="${d.id}">${d.name} (${d.code})</option>`).join('');
    } catch (err) {
      console.error('Failed to load board departments:', err);
    }
  },

  onDeptChange(deptId) {
    this.activeDeptId = deptId;
    this.fetchQueue();
  },

  async fetchQueue() {
    try {
      const res = await API.getPublicQueue(this.activeDeptId);
      const queue = res.data || { called: [], in_consultation: [], waiting: [], total_waiting: 0 };
      this.renderQueue(queue);
    } catch (err) {
      console.error('Error fetching public queue:', err);
    }
  },

  playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // AudioContext may be restricted by browser autoplay policy
    }
  },

  renderQueue(queue) {
    const calledCol = document.getElementById('board-col-called');
    const consultCol = document.getElementById('board-col-consult');
    const waitingCol = document.getElementById('board-col-waiting');
    const countBadge = document.getElementById('board-waiting-count');

    if (countBadge) {
      countBadge.textContent = `${queue.total_waiting} in queue`;
    }

    // Check for newly called tokens to ring chime
    const currentCalledIds = new Set(queue.called.map(t => t.id));
    let hasNewCall = false;
    currentCalledIds.forEach(id => {
      if (!this.lastCalledIds.has(id)) hasNewCall = true;
    });
    if (hasNewCall && this.lastCalledIds.size > 0) {
      this.playChime();
    }
    this.lastCalledIds = currentCalledIds;

    // 1. Render NOW CALLING
    if (calledCol) {
      if (queue.called.length === 0) {
        calledCol.innerHTML = `
          <div class="empty-box" style="padding: 2.5rem 1rem;">
            <div class="empty-icon">📢</div>
            <p>No active calls right now</p>
          </div>
        `;
      } else {
        calledCol.innerHTML = queue.called.map((t, idx) => `
          <div class="board-calling-hero ${idx === 0 ? 'pulse-attention' : ''}">
            <div style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.75);">Please Proceed To</div>
            <div class="calling-counter">${t.counter ? t.counter.label : 'Reception Desk'}</div>
            <div class="calling-number">${t.token_number}</div>
            <div style="font-size: 1.1rem; font-weight: 600;">${this.maskPatientName(t.patient_name)}</div>
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7); margin-top: 4px;">Dept: ${t.department ? t.department.name : '-'}</div>
          </div>
        `).join('');
      }
    }

    // 2. Render IN CONSULTATION
    if (consultCol) {
      if (queue.in_consultation.length === 0) {
        consultCol.innerHTML = `
          <div class="empty-box" style="padding: 2.5rem 1rem;">
            <div class="empty-icon">🩺</div>
            <p>Consultation rooms vacant</p>
          </div>
        `;
      } else {
        consultCol.innerHTML = queue.in_consultation.map(t => `
          <div class="board-token-item" style="border-left-color: var(--color-consultation);">
            <div>
              <div class="board-token-code">${t.token_number}</div>
              <div style="font-size: 0.95rem; font-weight: 600;">${this.maskPatientName(t.patient_name)}</div>
              <div style="font-size: 0.8rem; color: rgba(255,255,255,0.7);">${t.department ? t.department.code : ''} · ${t.counter ? t.counter.label : 'Doctor Room'}</div>
            </div>
            <span class="badge badge-in_consultation" style="font-size: 0.8rem;">In Session</span>
          </div>
        `).join('');
      }
    }

    // 3. Render WAITING TOKENS (with Uncertainty Estimation)
    if (waitingCol) {
      if (queue.waiting.length === 0) {
        waitingCol.innerHTML = `
          <div class="empty-box" style="padding: 2.5rem 1rem;">
            <div class="empty-icon">✓</div>
            <p>Waiting queue is currently empty</p>
          </div>
        `;
      } else {
        waitingCol.innerHTML = queue.waiting.map(t => {
          // Estimated wait with uncertainty range calculation
          const est = t.estimated_wait_minutes || 10;
          const delta = Math.max(3, Math.round(est * 0.25));
          const waitRange = `~${est} mins (±${delta}m)`;

          let priorityPill = '';
          if (t.priority === 'emergency') {
            priorityPill = `<span class="badge badge-priority-emergency">Emergency</span>`;
          } else if (t.priority === 'urgent') {
            priorityPill = `<span class="badge badge-priority-urgent">Urgent</span>`;
          }

          return `
            <div class="board-token-item" style="border-left-color: ${t.priority === 'emergency' ? 'var(--color-cancelled)' : t.priority === 'urgent' ? 'var(--color-called)' : 'var(--color-primary-light)'}">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="board-token-code">${t.token_number}</span>
                  ${priorityPill}
                </div>
                <div style="font-size: 0.92rem; font-weight: 600;">${this.maskPatientName(t.patient_name)}</div>
                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.7);">${t.department ? t.department.name : '-'}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--color-accent);">${waitRange}</div>
                <span class="uncertainty-note" style="color: rgba(255,255,255,0.6);">Est. Wait Range</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  // Privacy-friendly token name (Minimal token representation)
  maskPatientName(name) {
    if (!name) return 'Patient';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  }
};
