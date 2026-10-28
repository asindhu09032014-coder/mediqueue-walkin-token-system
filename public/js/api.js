// ============================================================
// MediQueue - API Client Module
// ============================================================

const API = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('mediqueue_token') || null;
  },

  setToken(token) {
    if (token) localStorage.setItem('mediqueue_token', token);
    else localStorage.removeItem('mediqueue_token');
  },

  getUser() {
    try {
      const u = localStorage.getItem('mediqueue_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) localStorage.setItem('mediqueue_user', JSON.stringify(user));
    else localStorage.removeItem('mediqueue_user');
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = data.error || (data.details ? data.details.map(d => d.message).join(', ') : 'Request failed');
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth Endpoints
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.data && res.data.token) {
      this.setToken(res.data.token);
      this.setUser(res.data.user);
    }
    return res.data;
  },

  async getMe() {
    const res = await this.request('/auth/me');
    if (res.data) this.setUser(res.data);
    return res.data;
  },

  logout() {
    this.setToken(null);
    this.setUser(null);
  },

  // Token Endpoints
  async getTokens(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/tokens?${query}`);
  },

  async getToken(id) {
    return await this.request(`/tokens/${id}`);
  },

  async trackToken(tokenNumber) {
    return await this.request(`/tokens/track/${encodeURIComponent(tokenNumber)}`);
  },

  async createToken(payload) {
    return await this.request('/tokens', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateTokenStatus(id, status, reason = null, counterId = null) {
    return await this.request(`/tokens/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason, counter_id: counterId })
    });
  },

  async getTokenEvents(id) {
    return await this.request(`/tokens/${id}/events`);
  },

  async getPublicQueue(departmentId = '') {
    const q = departmentId ? `?department_id=${departmentId}` : '';
    return await this.request(`/tokens/queue${q}`);
  },

  async getDashboard(departmentId = '') {
    const q = departmentId ? `?department_id=${departmentId}` : '';
    return await this.request(`/tokens/dashboard${q}`);
  },

  async getDailySummaries(startDate = '', endDate = '') {
    const p = new URLSearchParams();
    if (startDate) p.append('start_date', startDate);
    if (endDate) p.append('end_date', endDate);
    return await this.request(`/tokens/daily-summary?${p.toString()}`);
  },

  async generateDailySummary(date) {
    return await this.request('/tokens/daily-summary', {
      method: 'POST',
      body: JSON.stringify({ date })
    });
  },

  // Departments & Counters
  async getDepartments() {
    return await this.request('/departments');
  },

  async getCounters(departmentId = '') {
    const q = departmentId ? `?department_id=${departmentId}` : '';
    return await this.request(`/counters${q}`);
  },

  async assignCounterStaff(counterId, staffId) {
    return await this.request(`/counters/${counterId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ staff_id: staffId })
    });
  },

  // System Settings
  async getPublicSettings() {
    return await this.request('/settings/public');
  },

  async getAllSettings() {
    return await this.request('/settings');
  },

  async updateSetting(key, value) {
    return await this.request(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
  },

  // Staff Users
  async getStaffUsers() {
    return await this.request('/users/staff');
  }
};

// UI Toast Helper
function showToast(message, type = 'info') {
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }

  const toast = document.createElement('div');
  toast.className = `toast-msg ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
  toast.innerHTML = `<span style="font-weight: bold; font-size: 1.1rem;">${icon}</span> <span>${message}</span>`;
  stack.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
