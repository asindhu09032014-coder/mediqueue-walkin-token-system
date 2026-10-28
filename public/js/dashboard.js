// ============================================================
// MediQueue - Dashboard & Daily Summary Analytics Module
// ============================================================

const DashboardModule = {
  async init() {
    await this.loadMetrics();
    await this.loadDailySummaries();
  },

  async loadMetrics() {
    try {
      const res = await API.getDashboard();
      const m = res.data;

      // Update stat cards
      const elTotal = document.getElementById('dash-total-tokens');
      const elWaiting = document.getElementById('dash-waiting-tokens');
      const elConsult = document.getElementById('dash-consult-tokens');
      const elCompleted = document.getElementById('dash-completed-tokens');
      const elAvgWait = document.getElementById('dash-avg-wait');
      const elMaxWait = document.getElementById('dash-max-wait');

      if (elTotal) elTotal.textContent = m.total_today || 0;
      if (elWaiting) elWaiting.textContent = m.waiting || 0;
      if (elConsult) elConsult.textContent = m.in_consultation || 0;
      if (elCompleted) elCompleted.textContent = m.completed || 0;
      if (elAvgWait) elAvgWait.textContent = `${m.avg_wait_minutes || 0}m`;
      if (elMaxWait) elMaxWait.textContent = `${m.max_wait_minutes || 0}m`;

      // Render Priority Distribution Chart / Bars
      const pChart = document.getElementById('priority-breakdown-box');
      if (pChart && m.priority_breakdown) {
        const total = Math.max(1, (m.priority_breakdown.normal + m.priority_breakdown.urgent + m.priority_breakdown.emergency));
        const pNorm = Math.round((m.priority_breakdown.normal / total) * 100);
        const pUrg = Math.round((m.priority_breakdown.urgent / total) * 100);
        const pEmg = Math.round((m.priority_breakdown.emergency / total) * 100);

        pChart.innerHTML = `
          <div style="display: flex; height: 16px; border-radius: 8px; overflow: hidden; margin-bottom: 12px; background: #e5e7eb;">
            <div style="width: ${pNorm}%; background: var(--color-primary);" title="Normal: ${m.priority_breakdown.normal}"></div>
            <div style="width: ${pUrg}%; background: var(--color-priority-urgent);" title="Urgent: ${m.priority_breakdown.urgent}"></div>
            <div style="width: ${pEmg}%; background: var(--color-priority-emergency);" title="Emergency: ${m.priority_breakdown.emergency}"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
            <span><strong style="color: var(--color-primary);">■</strong> Normal: ${m.priority_breakdown.normal} (${pNorm}%)</span>
            <span><strong style="color: var(--color-priority-urgent);">■</strong> Urgent: ${m.priority_breakdown.urgent} (${pUrg}%)</span>
            <span><strong style="color: var(--color-priority-emergency);">■</strong> Emergency: ${m.priority_breakdown.emergency} (${pEmg}%)</span>
          </div>
        `;
      }

      // Render Hourly Queue Load
      const hChart = document.getElementById('hourly-load-chart');
      if (hChart && m.hourly_distribution) {
        const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        const maxVal = Math.max(1, ...hours.map(h => m.hourly_distribution[h] || 0));

        hChart.innerHTML = `
          <div style="display: flex; align-items: flex-end; gap: 8px; height: 140px; padding-top: 20px; border-bottom: 1px solid var(--color-border);">
            ${hours.map(h => {
              const val = m.hourly_distribution[h] || 0;
              const pct = Math.round((val / maxVal) * 100);
              return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end;">
                  <span style="font-size: 0.72rem; font-weight: 600; color: var(--color-text-secondary);">${val > 0 ? val : ''}</span>
                  <div style="width: 100%; height: ${Math.max(4, pct)}%; background: ${val > 0 ? 'var(--color-primary)' : 'var(--color-border-light)'}; border-radius: 4px 4px 0 0;" title="${h}:00 - ${val} patients"></div>
                  <span style="font-size: 0.7rem; color: var(--color-text-muted);">${h}h</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    } catch (err) {
      console.error('Error loading dashboard analytics:', err);
    }
  },

  async loadDailySummaries() {
    const tableBody = document.getElementById('daily-summaries-body');
    if (!tableBody) return;

    try {
      const res = await API.getDailySummaries();
      const summaries = res.data || [];

      if (summaries.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="empty-box">No historical daily summaries computed yet. Click "Generate Summary" below.</td></tr>`;
        return;
      }

      tableBody.innerHTML = summaries.map(s => `
        <tr>
          <td><strong>${s.summary_date}</strong></td>
          <td>${s.department ? s.department.name : 'All Departments'}</td>
          <td><span style="font-weight: 700;">${s.total_tokens}</span></td>
          <td><span style="color: var(--color-completed); font-weight: 600;">${s.completed_tokens}</span></td>
          <td>${s.avg_wait_minutes ? s.avg_wait_minutes + ' mins' : '-'}</td>
          <td>${s.avg_consultation_minutes ? s.avg_consultation_minutes + ' mins' : '-'}</td>
          <td>${s.peak_hour != null ? `${s.peak_hour}:00 (${s.peak_hour_count} patients)` : '-'}</td>
        </tr>
      `).join('');
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="7" class="empty-box" style="color: var(--color-cancelled);">Failed to load daily summaries: ${err.message}</td></tr>`;
    }
  },

  async triggerDailySummary() {
    const btn = document.getElementById('btn-run-daily-summary');
    if (btn) btn.disabled = true;

    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await API.generateDailySummary(today);
      showToast('Daily summary successfully computed and stored!', 'success');
      this.loadDailySummaries();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }
};
