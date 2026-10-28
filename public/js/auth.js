// ============================================================
// MediQueue - Authentication & Role Manager
// ============================================================

const Auth = {
  currentUser: null,

  init() {
    this.currentUser = API.getUser();
    this.updateUI();
  },

  isLoggedIn() {
    return !!API.getToken() && !!this.currentUser;
  },

  hasRole(...allowedRoles) {
    if (!this.currentUser) return false;
    return allowedRoles.includes(this.currentUser.role);
  },

  async login(email, password) {
    try {
      const data = await API.login(email, password);
      this.currentUser = data.user;
      this.updateUI();
      showToast(`Welcome back, ${data.user.full_name}!`, 'success');
      return data;
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
      throw err;
    }
  },

  logout() {
    API.logout();
    this.currentUser = null;
    this.updateUI();
    showToast('Logged out successfully', 'info');
    App.navigate('landing');
  },

  updateUI() {
    const loginBtn = document.getElementById('nav-login-btn');
    const userBadge = document.getElementById('nav-user-badge');
    const sidebarUser = document.getElementById('sidebar-user-info');
    const adminTabs = document.querySelectorAll('.admin-only');

    if (this.isLoggedIn()) {
      if (loginBtn) loginBtn.classList.add('hidden');
      if (userBadge) {
        userBadge.classList.remove('hidden');
        userBadge.innerHTML = `
          <span class="user-avatar">${this.currentUser.full_name.charAt(0)}</span>
          <span style="font-weight: 600; font-size: 0.88rem;">${this.currentUser.full_name}</span>
          <span class="badge badge-priority-normal">${this.currentUser.role}</span>
          <button class="btn btn-secondary btn-sm" onclick="Auth.logout()">Logout</button>
        `;
      }
      if (sidebarUser) {
        sidebarUser.innerHTML = `
          <div class="user-avatar">${this.currentUser.full_name.charAt(0)}</div>
          <div style="flex: 1; min-width: 0;">
            <div class="user-meta-name">${this.currentUser.full_name}</div>
            <div class="user-meta-role">${this.currentUser.role} · ${this.currentUser.email}</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="Auth.logout()" title="Logout">⏻</button>
        `;
      }

      // Hide or show admin-only elements
      const isAdmin = this.hasRole('admin');
      adminTabs.forEach(el => {
        if (isAdmin) el.classList.remove('hidden');
        else el.classList.add('hidden');
      });
    } else {
      if (loginBtn) loginBtn.classList.remove('hidden');
      if (userBadge) userBadge.classList.add('hidden');
      if (sidebarUser) {
        sidebarUser.innerHTML = `
          <button class="btn btn-primary w-full btn-sm" onclick="App.openLoginModal()">Login to Console</button>
        `;
      }
      adminTabs.forEach(el => el.classList.add('hidden'));
    }
  }
};
