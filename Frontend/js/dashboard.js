// Dashboard.js - Enhanced with smooth animations and interactions

const API_BASE = window.API_BASE || 'http://localhost/check-me-up/backend/api';
let doctorIdentityCache = null;
let dashboardCalendarCurrentMonth = new Date();
let adminAppointmentDotsByDate = {};
let doctorAppointmentDotsByDate = {};
let adminAppointmentsByDate = {};
let adminCalendarPopupElement = null;
let headerControlsInitialized = false;
let activeHeaderDropdown = null;
let notificationRefreshTimer = null;

const adminDashboardState = {
  appointments: [],
  doctors: [],
  filtersBound: false
};

const adminMessagesState = {
  items: [],
  loading: false
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  silentlyAutoCompleteAppointments();

  const sessionData = await verifyDashboardSession();
  if (!sessionData) {
    return;
  }

  const currentPage = window.location.pathname;
  const isDoctorDashboard = currentPage.includes('doctor-dashboard');
  const isAdminDashboard = currentPage.includes('admin-dashboard');
  const role = sessionData.data ? sessionData.data.user_role : null;

  if (isDoctorDashboard && role !== 'doctor') {
    localStorage.clear();
    window.location.replace('login.html');
    return;
  }

  if (isAdminDashboard && role !== 'admin') {
    localStorage.clear();
    window.location.replace('login.html');
    return;
  }

  initializeHeaderControls();

  if (isDoctorDashboardPage()) {
    bootstrapDoctorDashboard();
    return;
  }

  initializeDoctorIdentity();
  setHeaderGreeting();
  initializeAdminMobileSidebar();
  initializeNavigation();
  initializeSidebarNavigation();
  loadDashboardData();
  initializeCalendarWidget();
  initializeDateNavigation();
  addSectionTransitions();
  checkDashboardAccess(sessionData);
});

async function verifyDashboardSession() {
  try {
    const response = await fetch(`${API_BASE}/auth/session.php`, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json().catch(() => ({ success: false }));
    if (!result.success) {
      localStorage.clear();
      window.location.replace('login.html');
      return null;
    }

    return result;
  } catch (error) {
    console.error('Session check error:', error);
    localStorage.clear();
    window.location.replace('login.html');
    return null;
  }
}

function silentlyAutoCompleteAppointments() {
  fetch(`${API_BASE}/appointments/auto-complete.php`, {
    method: 'GET',
    credentials: 'include'
  }).catch(() => {});
}

function isDoctorDashboardPage() {
  return window.location.pathname.includes('doctor-dashboard');
}

function isAdminDashboardPage() {
  return window.location.pathname.includes('admin-dashboard');
}

function formatYearMonth(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function switchSectionViaNav(sectionId) {
  const nav = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (!nav) return;
  nav.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncateText(value, maxLength = 60) {
  const text = String(value ?? '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function formatAdminDateTime(value) {
  if (!value) return 'N/A';
  const normalized = String(value).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function updateMessagesBadge(count) {
  const badge = document.getElementById('messages-badge');
  if (!badge) return;
  badge.textContent = String(Number(count) || 0);
}

function bindAdminMessageToggleEvents() {
  const tbody = document.getElementById('admin-messages-body');
  if (!tbody || tbody.dataset.bound === '1') return;

  tbody.dataset.bound = '1';
  tbody.addEventListener('click', (event) => {
    const button = event.target.closest('.message-toggle-btn');
    if (!button) return;

    const preview = button.closest('.message-preview');
    if (!preview) return;

    const isExpanded = preview.dataset.expanded === '1';
    const truncated = preview.querySelector('.message-preview-text');
    const fullText = preview.querySelector('.message-full-text');

    if (isExpanded) {
      preview.dataset.expanded = '0';
      if (truncated) truncated.hidden = false;
      if (fullText) fullText.hidden = true;
      button.textContent = 'Read more';
    } else {
      preview.dataset.expanded = '1';
      if (truncated) truncated.hidden = true;
      if (fullText) fullText.hidden = false;
      button.textContent = 'Show less';
    }
  });
}

function renderAdminMessages(messages) {
  const tbody = document.getElementById('admin-messages-body');
  if (!tbody) return;

  bindAdminMessageToggleEvents();

  if (!Array.isArray(messages) || messages.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No messages yet</td></tr>';
    return;
  }

  tbody.innerHTML = messages.map((message) => {
    const fullMessage = String(message.message || '');
    const shouldTruncate = fullMessage.length > 60;
    const truncatedMessage = shouldTruncate ? truncateText(fullMessage, 60) : fullMessage;

    return `
      <tr>
        <td>${escapeHtml(message.full_name || 'N/A')}</td>
        <td>${escapeHtml(message.email || 'N/A')}</td>
        <td>${escapeHtml(message.subject || 'N/A')}</td>
        <td class="message-cell">
          <div class="message-preview" data-expanded="0">
            <span class="message-preview-text">${escapeHtml(truncatedMessage)}</span>
            <span class="message-full-text" hidden>${escapeHtml(fullMessage)}</span>
            ${shouldTruncate ? '<button type="button" class="message-toggle-btn">Read more</button>' : ''}
          </div>
        </td>
        <td class="message-date">${escapeHtml(formatAdminDateTime(message.submitted_at))}</td>
      </tr>
    `;
  }).join('');
}

async function loadAdminMessages() {
  const tbody = document.getElementById('admin-messages-body');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">Loading messages...</td></tr>';
  }

  try {
    const result = await fetchJson(`${API_BASE}/admin/messages.php`);
    if (!result.success) {
      throw new Error(result.message || 'Failed to load messages');
    }

    const messages = Array.isArray(result.data) ? result.data : [];
    adminMessagesState.items = messages;
    updateMessagesBadge(messages.length);
    renderAdminMessages(messages);
  } catch (error) {
    console.error('Error loading admin messages:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#EF4444;">Could not load messages</td></tr>';
    }
  }
}

async function performDashboardLogout() {
  localStorage.removeItem('checkmeup_user');
  localStorage.removeItem('checkmeup_role');
  localStorage.removeItem('user_role');

  try {
    await fetch(`${API_BASE}/auth/logout.php`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.warn('Logout request failed:', error);
  }

  window.location.replace('index.html');
}

function ensureHeaderModal(modalId, title, bodyMarkup) {
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(0,0,0,0.45)';
    modal.style.zIndex = '10050';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.innerHTML = `
      <div style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 1rem; width: min(92vw, 460px); box-shadow: 0 14px 36px rgba(0,0,0,0.35); position: relative;">
        <button type="button" data-close-modal="${modalId}" aria-label="Close" style="position: absolute; right: 12px; top: 8px; background: transparent; border: none; font-size: 22px; color: var(--text-secondary); cursor: pointer;">✕</button>
        <h3 style="margin-top: 0; margin-right: 24px;">${title}</h3>
        ${bodyMarkup}
      </div>
    `;
    document.body.appendChild(modal);
  }

  const closeButton = modal.querySelector(`[data-close-modal="${modalId}"]`);
  if (closeButton && !closeButton.dataset.bound) {
    closeButton.dataset.bound = '1';
    closeButton.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
  if (!modal.dataset.boundBackdrop) {
    modal.dataset.boundBackdrop = '1';
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  return modal;
}

function closeHeaderDropdowns() {
  document.querySelectorAll('.dashboard-header-dropdown').forEach((panel) => {
    panel.style.display = 'none';
  });
  activeHeaderDropdown = null;
}

async function fetchDashboardNotifications() {
  if (isDoctorDashboardPage()) {
    const result = await fetchJson(`${API_BASE}/doctor/appointments.php?status=pending`);
    if (!result.success) throw new Error(result.message || 'Failed to fetch notifications');
    return (result.data || []).map((item) => ({
      title: item.patient_name || 'Patient',
      subtitle: `${formatDate(item.appointment_date)} ${formatTime(item.appointment_time)}`,
      section: 'appointments'
    }));
  }

  if (isAdminDashboardPage()) {
    const result = await fetchJson(`${API_BASE}/admin/appointments.php?status=pending`);
    if (!result.success) throw new Error(result.message || 'Failed to fetch notifications');
    return (result.data || []).map((item) => ({
      title: item.patient_name || 'Patient',
      subtitle: `${formatDate(item.appointment_date)} ${formatTime(item.appointment_time)} · ${item.doctor_name || 'Doctor'}`,
      section: 'appointments'
    }));
  }

  return [];
}

function buildNotificationsMarkup(items) {
  if (!items.length) {
    return '<div style="color:#6B7280; font-size:13px; padding:0.25rem 0;">No new notifications</div>';
  }

  return items.map((item) => `
    <div style="padding:10px 0; border-bottom:1px solid var(--color-border);">
      <div style="font-weight:600; color: var(--text-primary);">${item.title}</div>
      <div style="font-size:12px; color:#6B7280; margin:2px 0 6px 0;">${item.subtitle}</div>
      <a href="#" class="header-notification-view" data-section="${item.section}" style="font-size:12px; color: var(--color-primary); text-decoration:none;">View</a>
    </div>
  `).join('');
}

function updateHeaderUserIdentity(fullName, email, phone) {
  const safeName = String(fullName || '').trim();
  const headerName = document.querySelector('.header-right .header-user-name');
  const sidebarName = document.querySelector('.sidebar-user-card .user-name');
  const greeting = document.querySelector('.header-greeting');

  if (headerName && safeName) {
    headerName.textContent = isDoctorDashboardPage() ? normalizeDoctorDisplayName(safeName) : safeName;
  }
  if (sidebarName && safeName) {
    sidebarName.textContent = isDoctorDashboardPage() ? normalizeDoctorDisplayName(safeName) : safeName;
  }
  if (greeting && safeName && isAdminDashboardPage()) {
    greeting.textContent = `Welcome back, ${safeName}!`;
  }

  const existingUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('checkmeup_user') || '{}');
    } catch {
      return {};
    }
  })();

  const updatedUser = {
    ...existingUser,
    name: safeName || existingUser.name,
    email: email || existingUser.email,
    phone: phone || existingUser.phone
  };
  localStorage.setItem('checkmeup_user', JSON.stringify(updatedUser));
}

function initializeHeaderControls() {
  if (headerControlsInitialized) return;
  const headerRight = document.querySelector('.header-right');
  if (!headerRight) return;
  headerControlsInitialized = true;

  if (getComputedStyle(headerRight).position === 'static') {
    headerRight.style.position = 'relative';
  }

  const settingsButton = headerRight.querySelector('.header-icon-btn[title="Settings"]');
  const notificationButton = headerRight.querySelector('.notification-btn');
  const badge = headerRight.querySelector('.notification-badge');

  updateNotificationBadge(0, badge);

  const notificationPanel = document.createElement('div');
  notificationPanel.className = 'dashboard-header-dropdown header-notifications-dropdown';
  notificationPanel.style.cssText = 'display:none; position:absolute; top:44px; right:0; width:min(92vw, 340px); max-height:360px; overflow:auto; background:var(--color-bg); border:1px solid var(--color-border); border-radius:10px; box-shadow:0 14px 32px rgba(0,0,0,0.22); padding:12px; z-index:10040;';
  headerRight.appendChild(notificationPanel);

  const settingsPanel = document.createElement('div');
  settingsPanel.className = 'dashboard-header-dropdown header-settings-dropdown';
  settingsPanel.style.cssText = 'display:none; position:absolute; top:44px; right:44px; width:220px; background:var(--color-bg); border:1px solid var(--color-border); border-radius:10px; box-shadow:0 14px 32px rgba(0,0,0,0.22); padding:8px; z-index:10040;';
  settingsPanel.innerHTML = `
    <button type="button" data-settings-action="edit-profile" style="width:100%; text-align:left; padding:10px; border:none; background:transparent; color:var(--text-primary); border-radius:8px; cursor:pointer;">Edit Profile</button>
    <button type="button" data-settings-action="change-password" style="width:100%; text-align:left; padding:10px; border:none; background:transparent; color:var(--text-primary); border-radius:8px; cursor:pointer;">Change Password</button>
    <button type="button" data-settings-action="logout" style="width:100%; text-align:left; padding:10px; border:none; background:transparent; color:#EF4444; border-radius:8px; cursor:pointer;">Logout</button>
  `;
  headerRight.appendChild(settingsPanel);

  const doctorProfileModal = isDoctorDashboardPage()
    ? ensureHeaderModal(
        'doctor-edit-profile-modal',
        'Edit Profile',
        `
          <form id="doctor-edit-profile-form" style="display:grid; gap:10px;">
            <label style="display:grid; gap:4px; font-size:13px; color:var(--text-secondary);">Full Name<input name="full_name" type="text" required style="padding:8px 10px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-bg-secondary); color:var(--text-primary);"></label>
            <label style="display:grid; gap:4px; font-size:13px; color:var(--text-secondary);">Phone<input name="phone" type="text" required style="padding:8px 10px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-bg-secondary); color:var(--text-primary);"></label>
            <label style="display:grid; gap:4px; font-size:13px; color:var(--text-secondary);">Bio<textarea name="bio" rows="4" required style="padding:8px 10px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-bg-secondary); color:var(--text-primary); resize:vertical;"></textarea></label>
            <div id="doctor-edit-profile-message" style="font-size:12px; min-height:16px;"></div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
              <button type="button" data-close-modal="doctor-edit-profile-modal" class="btn-small">Cancel</button>
              <button type="submit" class="btn-small">Save</button>
            </div>
          </form>
        `
      )
    : null;

  const profileModal = ensureHeaderModal(
    'header-edit-profile-modal',
    'Edit Profile',
    `
      <form id="header-edit-profile-form" style="display:grid; gap:10px;">
        <label style="display:grid; gap:4px; font-size:13px; color:var(--text-secondary);">Full Name<input name="full_name" type="text" required style="padding:8px 10px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-bg-secondary); color:var(--text-primary);"></label>
        <label style="display:grid; gap:4px; font-size:13px; color:var(--text-secondary);">Email<input name="email" type="email" required style="padding:8px 10px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-bg-secondary); color:var(--text-primary);"></label>
        <label style="display:grid; gap:4px; font-size:13px; color:var(--text-secondary);">Phone<input name="phone" type="text" style="padding:8px 10px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-bg-secondary); color:var(--text-primary);"></label>
        <div id="header-edit-profile-error" style="color:#EF4444; font-size:12px; min-height:16px;"></div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
          <button type="button" data-close-modal="header-edit-profile-modal" class="btn-small">Cancel</button>
          <button type="submit" class="btn-small">Save</button>
        </div>
      </form>
    `
  );

  const passwordModal = ensureHeaderModal(
    'header-change-password-modal',
    'Change Password',
    `
      <form id="header-change-password-form" style="display:grid; gap:10px;">
        <label style="display:grid; gap:4px; font-size:13px; color:var(--text-secondary);">Current Password<input name="current_password" type="password" required style="padding:8px 10px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-bg-secondary); color:var(--text-primary);"></label>
        <label style="display:grid; gap:4px; font-size:13px; color:var(--text-secondary);">New Password<input name="new_password" type="password" required style="padding:8px 10px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-bg-secondary); color:var(--text-primary);"></label>
        <label style="display:grid; gap:4px; font-size:13px; color:var(--text-secondary);">Confirm New Password<input name="confirm_password" type="password" required style="padding:8px 10px; border:1px solid var(--color-border); border-radius:8px; background:var(--color-bg-secondary); color:var(--text-primary);"></label>
        <div id="header-change-password-error" style="color:#EF4444; font-size:12px; min-height:16px;"></div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
          <button type="button" data-close-modal="header-change-password-modal" class="btn-small">Cancel</button>
          <button type="submit" class="btn-small">Save</button>
        </div>
      </form>
    `
  );

  notificationButton?.addEventListener('click', async (event) => {
    event.stopPropagation();
    const opening = activeHeaderDropdown !== notificationPanel;
    closeHeaderDropdowns();
    if (!opening) return;

    notificationPanel.style.display = 'block';
    activeHeaderDropdown = notificationPanel;
    updateNotificationBadge(0, badge);
    notificationPanel.innerHTML = '<div style="color:#6B7280; font-size:13px;">Loading notifications...</div>';

    try {
      const items = await fetchDashboardNotifications();
      notificationPanel.innerHTML = buildNotificationsMarkup(items);
    } catch (error) {
      notificationPanel.innerHTML = '<div style="color:#EF4444; font-size:13px;">Could not load notifications</div>';
    }
  });

  notificationPanel.addEventListener('click', (event) => {
    const viewLink = event.target.closest('.header-notification-view');
    if (!viewLink) return;
    event.preventDefault();
    const section = viewLink.getAttribute('data-section') || 'appointments';
    closeHeaderDropdowns();
    if (isDoctorDashboardPage()) {
      activateDoctorSection(section);
    } else {
      switchSectionViaNav(section);
    }
  });

  settingsButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    const opening = activeHeaderDropdown !== settingsPanel;
    closeHeaderDropdowns();
    if (!opening) return;
    settingsPanel.style.display = 'block';
    activeHeaderDropdown = settingsPanel;
  });

  settingsPanel.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-settings-action]');
    if (!actionButton) return;

    const action = actionButton.getAttribute('data-settings-action');
    closeHeaderDropdowns();

    if (action === 'logout') {
      await performDashboardLogout();
      return;
    }

    if (action === 'edit-profile') {
      if (isDoctorDashboardPage() && doctorProfileModal) {
        const form = doctorProfileModal.querySelector('#doctor-edit-profile-form');
        const messageEl = doctorProfileModal.querySelector('#doctor-edit-profile-message');
        if (messageEl) {
          messageEl.textContent = '';
          messageEl.style.color = 'var(--text-secondary)';
        }

        const profile = doctorDashboardState.profile || {};
        if (form) {
          bindPhoneSanitizer(form.elements.phone);
          form.elements.full_name.value = profile.full_name || '';
          form.elements.phone.value = profile.phone || '';
          form.elements.bio.value = profile.bio || '';
        }

        doctorProfileModal.style.display = 'flex';
        return;
      }

      const form = profileModal.querySelector('#header-edit-profile-form');
      const errorEl = profileModal.querySelector('#header-edit-profile-error');
      if (errorEl) errorEl.textContent = '';

      try {
        const result = await fetchJson(`${API_BASE}/auth/update-profile.php`, { method: 'GET' });
        if (!result.success) throw new Error(result.message || 'Could not load profile');
        bindPhoneSanitizer(form.elements.phone);
        form.elements.full_name.value = result.data?.full_name || '';
        form.elements.email.value = result.data?.email || '';
        form.elements.phone.value = result.data?.phone || '';
      } catch {
        if (errorEl) errorEl.textContent = 'Could not load profile data';
      }

      profileModal.style.display = 'flex';
      return;
    }

    if (action === 'change-password') {
      const form = passwordModal.querySelector('#header-change-password-form');
      const errorEl = passwordModal.querySelector('#header-change-password-error');
      if (form) form.reset();
      if (errorEl) errorEl.textContent = '';
      passwordModal.style.display = 'flex';
    }
  });

  const profileForm = profileModal.querySelector('#header-edit-profile-form');
  profileForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorEl = profileModal.querySelector('#header-edit-profile-error');
    if (errorEl) errorEl.textContent = '';

    const payload = {
      full_name: profileForm.elements.full_name.value.trim(),
      email: profileForm.elements.email.value.trim(),
      phone: profileForm.elements.phone.value.trim()
    };

    if (payload.phone && !isValidPhoneNumber(payload.phone)) {
      if (errorEl) errorEl.textContent = 'Phone number can only contain numbers, spaces, +, parentheses, and dashes.';
      return;
    }

    const submitBtn = profileForm.querySelector('button[type="submit"]');
    const oldText = submitBtn?.textContent || 'Save';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    try {
      const result = await fetchJson(`${API_BASE}/auth/update-profile.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!result.success) throw new Error(result.message || 'Could not update profile');

      updateHeaderUserIdentity(payload.full_name, payload.email, payload.phone);
      if (isDoctorDashboardPage() && doctorDashboardState.profile) {
        doctorDashboardState.profile.full_name = payload.full_name;
      }
      if (isDoctorDashboardPage()) {
        renderDoctorProfileCard();
        updateDoctorGreetingAndHeader();
      }
      profileModal.style.display = 'none';
    } catch (error) {
      if (errorEl) errorEl.textContent = error.message || 'Could not update profile';
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = oldText;
      }
    }
  });

  const doctorProfileForm = doctorProfileModal?.querySelector('#doctor-edit-profile-form');
  doctorProfileForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const messageEl = doctorProfileModal.querySelector('#doctor-edit-profile-message');
    if (messageEl) {
      messageEl.textContent = '';
    }

    const payload = {
      full_name: doctorProfileForm.elements.full_name.value.trim(),
      phone: doctorProfileForm.elements.phone.value.trim(),
      bio: doctorProfileForm.elements.bio.value.trim()
    };

    if (!payload.full_name || !payload.phone || !payload.bio) {
      if (messageEl) {
        messageEl.style.color = '#EF4444';
        messageEl.textContent = 'Please fill in all fields.';
      }
      return;
    }

    if (!isValidPhoneNumber(payload.phone)) {
      if (messageEl) {
        messageEl.style.color = '#EF4444';
        messageEl.textContent = 'Phone number can only contain numbers, spaces, +, parentheses, and dashes.';
      }
      return;
    }

    const submitBtn = doctorProfileForm.querySelector('button[type="submit"]');
    const oldText = submitBtn?.textContent || 'Save';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    try {
      const result = await fetchJson(`${API_BASE}/doctor/update-profile.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!result.success) {
        throw new Error(result.message || 'Could not update profile');
      }

      doctorDashboardState.profile = {
        ...(doctorDashboardState.profile || {}),
        full_name: payload.full_name,
        phone: payload.phone,
        bio: payload.bio
      };

      doctorIdentityCache = {
        ...(doctorIdentityCache || {}),
        displayName: normalizeDoctorDisplayName(payload.full_name),
        lastName: getDoctorLastName(payload.full_name),
        initials: getInitials(payload.full_name),
        specialty: doctorDashboardState.profile?.specialty || doctorIdentityCache?.specialty || '',
        branch: doctorDashboardState.profile?.branch || doctorIdentityCache?.branch || ''
      };

      renderDoctorProfileCard();
      updateDoctorGreetingAndHeader();
      updateHeaderUserIdentity(payload.full_name, doctorDashboardState.profile?.email || '', payload.phone);

      if (messageEl) {
        messageEl.style.color = '#10B981';
        messageEl.textContent = 'Profile updated successfully';
      }

      setTimeout(() => {
        doctorProfileModal.style.display = 'none';
        if (messageEl) messageEl.textContent = '';
      }, 900);
    } catch (error) {
      if (messageEl) {
        messageEl.style.color = '#EF4444';
        messageEl.textContent = error.message || 'Could not update profile';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = oldText;
      }
    }
  });

  const passwordForm = passwordModal.querySelector('#header-change-password-form');
  passwordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorEl = passwordModal.querySelector('#header-change-password-error');
    if (errorEl) errorEl.textContent = '';

    const payload = {
      current_password: passwordForm.elements.current_password.value,
      new_password: passwordForm.elements.new_password.value,
      confirm_password: passwordForm.elements.confirm_password.value
    };

    const submitBtn = passwordForm.querySelector('button[type="submit"]');
    const oldText = submitBtn?.textContent || 'Save';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    try {
      const result = await fetchJson(`${API_BASE}/auth/change-password.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!result.success) throw new Error(result.message || 'Could not change password');
      passwordModal.style.display = 'none';
      passwordForm.reset();
    } catch (error) {
      if (errorEl) errorEl.textContent = error.message || 'Could not change password';
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = oldText;
      }
    }
  });

  document.addEventListener('click', (event) => {
    if (!activeHeaderDropdown) return;
    if (headerRight.contains(event.target)) return;
    closeHeaderDropdowns();
  });

  if (notificationRefreshTimer) {
    window.clearInterval(notificationRefreshTimer);
  }
  notificationRefreshTimer = window.setInterval(() => {
    void refreshNotificationBadge(badge);
  }, 60000);

  void refreshNotificationBadge(badge);
}

const doctorDashboardState = {
  session: null,
  profile: null,
  stats: null,
  appointments: [],
  patients: [],
  currentWeekStart: null,
  scheduleDays: []
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options
  });
  return response.json();
}

function getStartOfWeekMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDateYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDateTimeValue(dateValue, timeValue) {
  return new Date(`${dateValue}T${timeValue}`);
}

function setSectionInlineError(sectionId, message = 'Could not load data. Please try again.') {
  const section = document.getElementById(sectionId);
  if (!section) return;
  let container = section.querySelector('.doctor-section-error');
  if (!container) {
    container = document.createElement('div');
    container.className = 'doctor-section-error';
    container.style.color = '#EF4444';
    container.style.padding = '0.75rem 0';
    section.querySelector('.section-container')?.prepend(container);
  }
  container.textContent = message;
}

function clearSectionInlineError(sectionId) {
  const section = document.getElementById(sectionId);
  const container = section?.querySelector('.doctor-section-error');
  if (container) {
    container.remove();
  }
}

function updateDoctorGreetingAndHeader() {
  const greetingElement = document.querySelector('.header-greeting');
  const subtitleElement = document.getElementById('header-subtitle');
  const profile = doctorDashboardState.profile;
  const stats = doctorDashboardState.stats;

  if (!profile || !greetingElement) return;

  const hour = new Date().getHours();
  let greeting = 'Good Morning';
  if (hour >= 12 && hour < 18) greeting = 'Good Afternoon';
  if (hour >= 18) greeting = 'Good Evening';

  greetingElement.textContent = `${greeting}, Dr. ${getDoctorLastName(profile.full_name)}!`;
  if (subtitleElement && stats) {
    const count = Number(stats.today_appointments || 0);
    subtitleElement.textContent = `You have ${count} appointment${count !== 1 ? 's' : ''} today`;
  }
  updateNotificationBadge(stats ? Number(stats.pending_confirmations || 0) : 0);
}

function sanitizePhoneInput(value) {
  return String(value || '').replace(/[^0-9+\s\-()+]/g, '');
}

function isValidPhoneNumber(phone) {
  return /^[0-9+\s\-()+]{7,20}$/.test(String(phone || '').trim());
}

function bindPhoneSanitizer(input) {
  if (!input || input.dataset.phoneSanitized === '1') return;
  input.dataset.phoneSanitized = '1';
  input.addEventListener('input', () => {
    const nextValue = sanitizePhoneInput(input.value);
    if (nextValue !== input.value) {
      input.value = nextValue;
    }
  });
}

function updateNotificationBadge(count, badgeElement = document.getElementById('notification-badge')) {
  if (!badgeElement) return 0;
  const normalizedCount = Math.max(0, Number(count) || 0);
  badgeElement.textContent = String(normalizedCount);
  badgeElement.style.display = normalizedCount > 0 ? 'inline-flex' : 'none';
  return normalizedCount;
}

async function refreshNotificationBadge(badgeElement = document.getElementById('notification-badge')) {
  try {
    const items = await fetchDashboardNotifications();
    updateNotificationBadge(items.length, badgeElement);
    return items;
  } catch (error) {
    updateNotificationBadge(0, badgeElement);
    return [];
  }
}

function renderDoctorProfileCard() {
  const profile = doctorDashboardState.profile;
  if (!profile) return;

  const initials = getInitials(profile.full_name);
  const sidebarAvatar = document.querySelector('.sidebar-user-card .user-avatar');
  const sidebarName = document.querySelector('.sidebar-user-card .user-name');
  const sidebarRole = document.querySelector('.sidebar-user-card .user-role');
  const headerAvatar = document.querySelector('.header-right .header-avatar');
  const headerName = document.querySelector('.header-right .header-user-name');

  if (sidebarAvatar) sidebarAvatar.textContent = initials;
  if (sidebarName) sidebarName.textContent = normalizeDoctorDisplayName(profile.full_name);
  if (sidebarRole) sidebarRole.textContent = profile.specialty || 'Doctor';
  if (headerAvatar) headerAvatar.textContent = initials;
  if (headerName) headerName.textContent = normalizeDoctorDisplayName(profile.full_name);
}

function setDoctorStatCardsWithAnimation(stats) {
  const statCards = document.querySelectorAll('#overview .stat-value');
  const values = [
    Number(stats.today_appointments || 0),
    Number(stats.total_patients || 0),
    Number(stats.pending_confirmations || 0)
  ];

  statCards.forEach((node, index) => {
    if (index > 2) return;
    animateCountUp(node, 0, values[index], 900, false);
  });
}

function renderDoctorOverviewRecentPatients() {
  const tbody = document.getElementById('recent-patients-tbody');
  if (!tbody) return;

  const byPatient = new Map();
  doctorDashboardState.appointments.forEach((appt) => {
    const key = appt.patient_id || appt.patient_name;
    const prev = byPatient.get(key);
    const currDate = toDateTimeValue(appt.appointment_date, appt.appointment_time || '00:00:00');
    if (!prev || currDate > prev._dt) {
      byPatient.set(key, {
        patient_id: appt.patient_id,
        patient_name: appt.patient_name,
        patient_phone: appt.patient_phone,
        last_visit: appt.appointment_date,
        status: appt.status,
        _dt: currDate
      });
    }
  });

  const rows = Array.from(byPatient.values())
    .sort((a, b) => b._dt - a._dt)
    .slice(0, 5);

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#6B7280; padding:1rem;">No recent patients</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((row, idx) => `
    <tr>
      <td>
        <div class="patient-cell">
          <div class="patient-avatar">${getInitials(row.patient_name)}</div>
          <div class="patient-info">
            <div class="patient-name">${row.patient_name || 'N/A'}</div>
            <div class="patient-age">${row.patient_phone || 'Phone not available'}</div>
          </div>
        </div>
      </td>
      <td>P-${String(row.patient_id || idx + 1).padStart(5, '0')}</td>
      <td>${doctorDashboardState.patients.find(p => p.id === row.patient_id)?.insurance_company || 'N/A'}</td>
      <td>${formatDate(row.last_visit)}</td>
      <td><span class="badge ${statusBadgeClass(row.status)}">${capitalize(row.status)}</span></td>
    </tr>
  `).join('');
}

function renderDoctorOverviewRecentPatientsSkeleton() {
  const tbody = document.getElementById('recent-patients-tbody');
  if (!tbody) return;

  tbody.innerHTML = Array.from({ length: 4 }).map(() => `
    <tr>
      <td><div class="doctor-skeleton" style="height: 16px; border-radius: 6px;"></div></td>
      <td><div class="doctor-skeleton" style="height: 16px; border-radius: 6px;"></div></td>
      <td><div class="doctor-skeleton" style="height: 16px; border-radius: 6px;"></div></td>
      <td><div class="doctor-skeleton" style="height: 16px; border-radius: 6px;"></div></td>
      <td><div class="doctor-skeleton" style="height: 16px; border-radius: 6px;"></div></td>
    </tr>
  `).join('');
}

function renderDoctorCalendarDots() {
  doctorAppointmentDotsByDate = {};
  doctorDashboardState.appointments.forEach((appointment) => {
    const dateKey = appointment.appointment_date;
    if (!dateKey) return;
    if (!doctorAppointmentDotsByDate[dateKey]) doctorAppointmentDotsByDate[dateKey] = [];

    let normalizedStatus = appointment.status;
    if (normalizedStatus === 'completed') normalizedStatus = 'confirmed';
    if (!doctorAppointmentDotsByDate[dateKey].includes(normalizedStatus)) {
      doctorAppointmentDotsByDate[dateKey].push(normalizedStatus);
    }
  });

  renderCalendar(dashboardCalendarCurrentMonth);
}

function renderDoctorAppointmentsSkeleton() {
  const tbody = document.getElementById('appointments-tbody');
  if (!tbody) return;
  tbody.innerHTML = Array.from({ length: 5 }).map(() => `
    <tr>
      <td><div class="doctor-skeleton" style="height: 18px; border-radius: 6px;"></div></td>
      <td><div class="doctor-skeleton" style="height: 18px; border-radius: 6px;"></div></td>
      <td><div class="doctor-skeleton" style="height: 18px; border-radius: 6px;"></div></td>
      <td><div class="doctor-skeleton" style="height: 18px; border-radius: 6px;"></div></td>
      <td><div class="doctor-skeleton" style="height: 18px; border-radius: 6px;"></div></td>
      <td><div class="doctor-skeleton" style="height: 18px; border-radius: 6px;"></div></td>
      <td><div class="doctor-skeleton" style="height: 18px; border-radius: 6px;"></div></td>
    </tr>
  `).join('');
}

function getDoctorAppointmentFilteredData() {
  const status = document.getElementById('doctor-status-filter')?.value || 'all';
  const from = document.getElementById('doctor-date-from')?.value || '';
  const to = document.getElementById('doctor-date-to')?.value || '';

  return doctorDashboardState.appointments.filter((appt) => {
    if (status !== 'all' && appt.status !== status) return false;
    if (from && appt.appointment_date < from) return false;
    if (to && appt.appointment_date > to) return false;
    return true;
  });
}

function renderDoctorAppointmentsTable() {
  const tbody = document.getElementById('appointments-tbody');
  if (!tbody) return;

  const rows = getDoctorAppointmentFilteredData();
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#6B7280; padding:1rem;">No appointments found</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((appt) => {
    const canConfirm = appt.status === 'pending';
    const canCancel = appt.status === 'pending' || appt.status === 'confirmed';
    const statusLabel = capitalize(appt.status);

    return `
      <tr data-appointment-id="${appt.id}">
        <td>${appt.patient_name || 'N/A'}</td>
        <td>${formatDate(appt.appointment_date)}</td>
        <td>${formatTime(appt.appointment_time)}</td>
        <td>${appt.specialty || 'N/A'}</td>
        <td>${appt.branch || 'N/A'}</td>
        <td><span class="badge ${statusBadgeClass(appt.status)}">${statusLabel}</span></td>
        <td>
          <div class="appointment-actions">
            ${canConfirm ? '<button class="btn-small" data-action="confirm">Confirm</button>' : ''}
            ${canCancel ? '<button class="btn-small" data-action="cancel" style="background:#EF4444;">Cancel</button>' : ''}
          </div>
          <div class="appointment-row-error" style="color:#EF4444; font-size:12px; margin-top:6px; min-height:16px;"></div>
        </td>
      </tr>
    `;
  }).join('');
}

function bindDoctorAppointmentsInteractions() {
  const pendingShortcut = document.getElementById('doctor-pending-shortcut');
  const status = document.getElementById('doctor-status-filter');
  const from = document.getElementById('doctor-date-from');
  const to = document.getElementById('doctor-date-to');
  const tbody = document.getElementById('appointments-tbody');

  pendingShortcut?.addEventListener('click', () => {
    if (status) {
      status.value = 'pending';
    }
    renderDoctorAppointmentsTable();
  });

  [status, from, to].forEach((node) => {
    node?.addEventListener('input', () => {
      renderDoctorAppointmentsTable();
    });
    node?.addEventListener('change', () => {
      renderDoctorAppointmentsTable();
    });
  });

  tbody?.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const row = button.closest('tr');
    const id = Number(row?.dataset.appointmentId || 0);
    if (!id) return;

    const rowError = row?.querySelector('.appointment-row-error');
    if (rowError) {
      rowError.textContent = '';
    }

    const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
    const rowButtons = row ? Array.from(row.querySelectorAll('button[data-action]')) : [];
    const originalTexts = new Map();
    rowButtons.forEach((btn) => {
      originalTexts.set(btn, btn.textContent);
      btn.disabled = true;
      btn.textContent = 'Saving...';
    });

    try {
      const result = await fetchJson(`${API_BASE}/doctor/appointments.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: id, status: newStatus })
      });

      if (!result.success) {
        throw new Error(result.message || 'Could not load data. Please try again.');
      }

      const target = doctorDashboardState.appointments.find(a => Number(a.id) === id);
      if (target) {
        target.status = newStatus;
      }
      renderDoctorAppointmentsTable();
      await loadDoctorStats();
      renderDoctorOverviewRecentPatients();
      renderDoctorCalendarDots();
    } catch (error) {
      if (rowError) {
        rowError.textContent = 'Could not update this appointment. Please try again.';
      }
      rowButtons.forEach((btn) => {
        btn.disabled = false;
        btn.textContent = originalTexts.get(btn) || btn.textContent;
      });
    }
  });
}

function renderDoctorPatientsGridSkeleton() {
  const grid = document.getElementById('patients-grid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="patient-card">
      <div class="doctor-skeleton" style="height: 32px; border-radius: 999px; margin-bottom: 10px;"></div>
      <div class="doctor-skeleton" style="height: 16px; border-radius: 6px; margin-bottom: 8px;"></div>
      <div class="doctor-skeleton" style="height: 14px; border-radius: 6px;"></div>
    </div>
  `).join('');
}

function renderDoctorPatientsGrid() {
  const grid = document.getElementById('patients-grid');
  const search = document.getElementById('doctor-patients-search')?.value.toLowerCase().trim() || '';
  if (!grid) return;

  const rows = doctorDashboardState.patients.filter((patient) => {
    if (!search) return true;
    return (patient.full_name || '').toLowerCase().includes(search);
  });

  if (!rows.length) {
    grid.innerHTML = '<div class="doctor-empty-state">No patients found</div>';
    return;
  }

  grid.innerHTML = rows.map((patient) => {
    const age = calculateAge(patient.date_of_birth);
    return `
      <article class="patient-card">
        <div class="patient-card-top">
          <div class="patient-avatar">${getInitials(patient.full_name)}</div>
          <div>
            <div class="patient-name">${patient.full_name || 'N/A'}</div>
            <div class="patient-age">${age === 'N/A' ? 'Age unavailable' : `${age} years`}</div>
          </div>
        </div>
        <div class="patient-card-meta">
          <div>Last Visit: ${formatDate(patient.last_visit)}</div>
          <div><span class="badge badge-completed">${patient.insurance_company || 'No Insurance'}</span></div>
          <div>Phone: ${patient.phone || 'N/A'}</div>
        </div>
        <div style="margin-top: 12px;">
          <button class="btn-small btn-view-patient-profile" type="button" data-patient-id="${patient.id}">View Profile</button>
        </div>
      </article>
    `;
  }).join('');
}

function bindDoctorPatientsSearch() {
  const input = document.getElementById('doctor-patients-search');
  if (!input) return;
  input.addEventListener('input', () => {
    renderDoctorPatientsGrid();
  });
}

function bindDoctorPatientProfileModal() {
  const grid = document.getElementById('patients-grid');
  const modal = document.getElementById('patient-profile-modal');
  const body = document.getElementById('patient-profile-modal-body');
  const closeBtn = document.getElementById('patient-profile-modal-close');
  if (!grid || !modal || !body || !closeBtn) return;

  const close = () => {
    modal.style.display = 'none';
  };

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });

  grid.addEventListener('click', (event) => {
    const button = event.target.closest('.btn-view-patient-profile');
    if (!button) return;

    const patientId = Number(button.dataset.patientId || 0);
    const patient = doctorDashboardState.patients.find((item) => Number(item.id) === patientId);
    if (!patient) return;

    body.innerHTML = `
      <p><strong>Full Name:</strong> ${patient.full_name || 'N/A'}</p>
      <p><strong>Email:</strong> ${patient.email || 'N/A'}</p>
      <p><strong>Phone:</strong> ${patient.phone || 'N/A'}</p>
      <p><strong>Date of Birth:</strong> ${formatDate(patient.date_of_birth)}</p>
      <p><strong>Gender:</strong> ${patient.gender || 'N/A'}</p>
      <p><strong>Insurance Company:</strong> ${patient.insurance_company || 'N/A'}</p>
      <p><strong>Last Visit Date:</strong> ${formatDate(patient.last_visit)}</p>
      <p><strong>Total Appointments with You:</strong> ${Number(patient.total_appointments || 0)}</p>
    `;
    modal.style.display = 'flex';
  });
}

function renderDoctorScheduleAudit(days) {
  const timeline = document.getElementById('schedule-timeline');
  const rangeLabel = document.getElementById('doctor-week-range-label');
  if (!timeline) return;

  doctorDashboardState.scheduleDays = Array.isArray(days) ? days : [];
  if (rangeLabel && doctorDashboardState.currentWeekStart) {
    const end = new Date(doctorDashboardState.currentWeekStart);
    end.setDate(end.getDate() + 4);
    rangeLabel.textContent = `${formatDate(formatDateYmd(doctorDashboardState.currentWeekStart))} - ${formatDate(formatDateYmd(end))}`;
  }

  if (!doctorDashboardState.scheduleDays.length) {
    timeline.innerHTML = '<div class="doctor-empty-state">No appointments</div>';
    return;
  }

  timeline.innerHTML = doctorDashboardState.scheduleDays.map((day) => {
    const blocks = (day.appointments || []).map((appointment) => `
      <button class="appointment-block" type="button" data-day="${day.date}" data-time="${appointment.appointment_time}" data-patient="${appointment.patient_name || ''}" data-phone="${appointment.patient_phone || ''}" data-status="${appointment.status || ''}" style="background:${statusToColor(appointment.status)}; width:100%; text-align:left;">
        <div style="font-weight:600; margin-bottom:2px;">${appointment.patient_name || 'Patient'}</div>
        <div>${formatTime(appointment.appointment_time)}</div>
        <div style="text-transform:capitalize; opacity:0.95;">${appointment.status || 'pending'}</div>
      </button>
    `).join('');

    return `
      <div class="schedule-time-column">
        <div class="schedule-time">${day.day}, ${formatDate(day.date)}</div>
        ${blocks || '<div style="color:#6B7280; font-size:12px; margin-bottom:8px;">No appointments</div>'}
      </div>
    `;
  }).join('');
}

function bindSchedulePopup() {
  const timeline = document.getElementById('schedule-timeline');
  const modal = document.getElementById('schedule-appointment-modal');
  const body = document.getElementById('schedule-appointment-modal-body');
  const closeButton = document.getElementById('schedule-appointment-modal-close');
  if (!timeline || !modal || !body || !closeButton) return;

  const close = () => {
    modal.style.display = 'none';
  };

  closeButton.addEventListener('click', close);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) close();
  });

  timeline.addEventListener('click', (event) => {
    const block = event.target.closest('.appointment-block');
    if (!block) return;
    body.innerHTML = `
      <p><strong>Patient:</strong> ${block.dataset.patient || 'N/A'}</p>
      <p><strong>Phone:</strong> ${block.dataset.phone || 'N/A'}</p>
      <p><strong>Time:</strong> ${formatTime(block.dataset.time || '')}</p>
      <p><strong>Status:</strong> ${capitalize(block.dataset.status || '')}</p>
    `;
    modal.style.display = 'flex';
  });
}

function renderDoctorScheduleSkeleton() {
  const timeline = document.getElementById('schedule-timeline');
  if (!timeline) return;
  timeline.innerHTML = Array.from({ length: 5 }).map((_, idx) => `
    <div class="schedule-time-column">
      <div class="schedule-time">Loading Day ${idx + 1}...</div>
      <div class="doctor-skeleton" style="height: 48px; border-radius: 6px; margin-bottom: 8px;"></div>
      <div class="doctor-skeleton" style="height: 48px; border-radius: 6px;"></div>
    </div>
  `).join('');
}

async function loadDoctorScheduleForWeek(weekStartDate) {
  try {
    clearSectionInlineError('schedule');
    doctorDashboardState.currentWeekStart = new Date(weekStartDate);
    renderDoctorScheduleSkeleton();

    const weekStart = formatDateYmd(doctorDashboardState.currentWeekStart);
    const result = await fetchJson(`${API_BASE}/doctor/schedule.php?start=${encodeURIComponent(weekStart)}`);
    if (!result.success) {
      throw new Error(result.message || 'Could not load data. Please try again.');
    }
    renderDoctorScheduleAudit(result.data?.days || []);
  } catch (error) {
    setSectionInlineError('schedule', 'Could not load data. Please try again.');
  }
}

function bindDoctorScheduleWeekNavigation() {
  const prev = document.getElementById('doctor-week-prev');
  const next = document.getElementById('doctor-week-next');

  prev?.addEventListener('click', async () => {
    if (!doctorDashboardState.currentWeekStart) return;
    const newStart = new Date(doctorDashboardState.currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    await loadDoctorScheduleForWeek(newStart);
  });

  next?.addEventListener('click', async () => {
    if (!doctorDashboardState.currentWeekStart) return;
    const newStart = new Date(doctorDashboardState.currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    await loadDoctorScheduleForWeek(newStart);
  });
}

async function activateDoctorSection(sectionId, options = {}) {
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  const sections = document.querySelectorAll('.content-section');
  const statusFilter = options.statusFilter || '';

  navItems.forEach((item) => item.classList.toggle('active', item.dataset.section === sectionId));
  sections.forEach((section) => section.classList.toggle('active', section.id === sectionId));

  if (sectionId === 'appointments') {
    const filter = document.getElementById('doctor-status-filter');
    if (filter && statusFilter) {
      filter.value = statusFilter;
    }
    renderDoctorAppointmentsTable();
  }

  if (sectionId === 'patients') {
    renderDoctorPatientsGrid();
  }

  if (sectionId === 'schedule' && doctorDashboardState.currentWeekStart) {
    await loadDoctorScheduleForWeek(doctorDashboardState.currentWeekStart);
  }

  const content = document.querySelector('.dashboard-content');
  content?.scrollTo({ top: 0, behavior: 'smooth' });
}

function bindDoctorLogoutAction() {
  const logoutLink = document.querySelector('.nav-item.logout');
  if (!logoutLink) return;

  logoutLink.addEventListener('click', async (event) => {
    event.preventDefault();
    await performDashboardLogout();
  });
}

function initializeDoctorSectionNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-section]');

  navItems.forEach((item) => {
    item.addEventListener('click', async (event) => {
      event.preventDefault();
      const sectionId = item.dataset.section;
      if (!sectionId) return;
      await activateDoctorSection(sectionId);
    });
  });

  document.querySelectorAll('.stat-link[data-section], .see-all-link[data-section], .overview-shortcut[data-section]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const sectionId = link.getAttribute('data-section');
      if (!sectionId) return;
      const statusFilter = link.getAttribute('data-status-filter') || '';
      await activateDoctorSection(sectionId, { statusFilter });
    });
  });

  bindDoctorLogoutAction();
  activateDoctorSection('overview');
}

async function loadDoctorStats() {
  const result = await fetchJson(`${API_BASE}/doctor/stats.php`);
  if (!result.success) {
    throw new Error(result.message || 'Could not load data. Please try again.');
  }
  clearSectionInlineError('overview');
  doctorDashboardState.stats = result.data || {
    today_appointments: 0,
    total_patients: 0,
    pending_confirmations: 0
  };
  setDoctorStatCardsWithAnimation(doctorDashboardState.stats);
  updateDoctorGreetingAndHeader();
}

async function loadDoctorProfile() {
  const result = await fetchJson(`${API_BASE}/doctor/profile.php`);
  if (!result.success) {
    throw new Error(result.message || 'Could not load data. Please try again.');
  }
  clearSectionInlineError('overview');
  doctorDashboardState.profile = result.data;
  renderDoctorProfileCard();
  updateDoctorGreetingAndHeader();
}

async function loadDoctorAppointments() {
  clearSectionInlineError('appointments');
  renderDoctorAppointmentsSkeleton();
  renderDoctorOverviewRecentPatientsSkeleton();
  const result = await fetchJson(`${API_BASE}/doctor/appointments.php`);
  if (!result.success) {
    throw new Error(result.message || 'Could not load data. Please try again.');
  }
  doctorDashboardState.appointments = Array.isArray(result.data) ? result.data : [];
  renderDoctorAppointmentsTable();
  renderDoctorOverviewRecentPatients();
  renderDoctorCalendarDots();
}

async function loadDoctorPatients() {
  clearSectionInlineError('patients');
  renderDoctorPatientsGridSkeleton();
  const result = await fetchJson(`${API_BASE}/doctor/patients.php`);
  if (!result.success) {
    throw new Error(result.message || 'Could not load data. Please try again.');
  }
  doctorDashboardState.patients = Array.isArray(result.data) ? result.data : [];
  renderDoctorPatientsGrid();
}

async function bootstrapDoctorDashboard() {
  try {
    const sessionResult = await fetchJson(`${API_BASE}/auth/session.php`);
    if (!sessionResult.success || sessionResult.data?.user_role !== 'doctor') {
      localStorage.clear();
      window.location.replace('login.html');
      return;
    }

    doctorDashboardState.session = sessionResult.data;

    initializeDoctorSectionNavigation();
    bindDoctorAppointmentsInteractions();
    bindDoctorPatientsSearch();
    bindDoctorPatientProfileModal();
    bindDoctorScheduleWeekNavigation();
    bindSchedulePopup();

    dashboardCalendarCurrentMonth = new Date();
    renderCalendar(dashboardCalendarCurrentMonth);

    try {
      await loadDoctorProfile();
    } catch {
      setSectionInlineError('overview', 'Could not load data. Please try again.');
    }

    try {
      await loadDoctorStats();
    } catch {
      setSectionInlineError('overview', 'Could not load data. Please try again.');
    }

    try {
      await loadDoctorAppointments();
    } catch {
      setSectionInlineError('appointments', 'Could not load data. Please try again.');
    }

    try {
      await loadDoctorPatients();
    } catch {
      setSectionInlineError('patients', 'Could not load data. Please try again.');
    }

    doctorDashboardState.currentWeekStart = getStartOfWeekMonday(new Date());
    await loadDoctorScheduleForWeek(doctorDashboardState.currentWeekStart);
  } catch (error) {
    console.error('Doctor dashboard bootstrap failed:', error);
    localStorage.clear();
    window.location.replace('login.html');
  }
}

function normalizeDoctorDisplayName(name) {
  const cleaned = String(name || '').trim().replace(/^dr\.?\s*/i, '');
  if (!cleaned) {
    return 'Dr. Doctor';
  }
  return `Dr. ${cleaned}`;
}

function getDoctorLastName(name) {
  const cleaned = String(name || '').trim().replace(/^dr\.?\s*/i, '');
  if (!cleaned) {
    return 'Doctor';
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : 'Doctor';
}

function getInitials(name) {
  const cleaned = String(name || '').trim().replace(/^dr\.?\s*/i, '');
  if (!cleaned) {
    return 'DR';
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

async function fetchDoctorIdentity() {
  if (doctorIdentityCache) {
    return doctorIdentityCache;
  }

  const sessionResponse = await fetch(`${API_BASE}/auth/session.php`, {
    method: 'GET',
    credentials: 'include'
  });
  const sessionResult = await sessionResponse.json();

  if (!sessionResult.success || sessionResult.data?.user_role !== 'doctor') {
    throw new Error('No active doctor session');
  }

  const sessionName = String(sessionResult.data?.name || sessionResult.data?.user_name || 'Doctor').trim();

  let profileData = null;
  try {
    const profileResponse = await fetch(`${API_BASE}/doctor/profile.php`, {
      method: 'GET',
      credentials: 'include'
    });
    const profileResult = await profileResponse.json();
    if (profileResult.success && profileResult.data) {
      profileData = profileResult.data;
    }
  } catch (error) {
    console.warn('Could not load doctor profile details:', error);
  }

  const fullName = (profileData?.full_name || sessionName || 'Doctor').trim();
  const displayName = normalizeDoctorDisplayName(fullName);

  doctorIdentityCache = {
    displayName,
    lastName: getDoctorLastName(fullName),
    initials: getInitials(fullName),
    specialty: profileData?.specialty || '',
    branch: profileData?.branch || ''
  };

  return doctorIdentityCache;
}

async function initializeDoctorIdentity() {
  if (!isDoctorDashboardPage()) {
    return;
  }

  try {
    const identity = await fetchDoctorIdentity();

    const sidebarAvatar = document.querySelector('.sidebar-user-card .user-avatar');
    const sidebarName = document.querySelector('.sidebar-user-card .user-name');
    const sidebarRole = document.querySelector('.sidebar-user-card .user-role');
    const headerAvatar = document.querySelector('.header-right .header-avatar');
    let headerUserName = document.querySelector('.header-right .header-user-name');

    if (!headerUserName) {
      headerUserName = document.createElement('span');
      headerUserName.className = 'header-user-name';
      const headerRight = document.querySelector('.header-right');
      if (headerRight) {
        headerRight.appendChild(headerUserName);
      }
    }

    if (sidebarAvatar) sidebarAvatar.textContent = identity.initials;
    if (sidebarName) sidebarName.textContent = identity.displayName;
    if (headerAvatar) headerAvatar.textContent = identity.initials;
    if (headerUserName) headerUserName.textContent = identity.displayName;

    if (sidebarRole) {
      if (identity.specialty && identity.branch) {
        sidebarRole.textContent = `${identity.specialty} - ${identity.branch}`;
      } else if (identity.specialty) {
        sidebarRole.textContent = identity.specialty;
      } else if (identity.branch) {
        sidebarRole.textContent = identity.branch;
      } else {
        sidebarRole.textContent = 'Doctor';
      }
    }
  } catch (error) {
    console.error('Failed to initialize doctor identity:', error);
  }
}

// Set greeting based on time of day
function setHeaderGreeting() {
  const greetingElement = document.querySelector('.header-greeting');
  const subtitleElement = document.querySelector('#header-subtitle');
  
  if (!greetingElement) return;

  const hour = new Date().getHours();
  let greeting = 'Good Morning';
  
  if (hour >= 12 && hour < 18) {
    greeting = 'Good Afternoon';
  } else if (hour >= 18) {
    greeting = 'Good Evening';
  }

  if (isDoctorDashboardPage()) {
    fetchDoctorIdentity()
      .then(identity => {
        greetingElement.textContent = `${greeting}, Dr. ${identity.lastName}!`;
      })
      .catch(() => {
        greetingElement.textContent = `${greeting}, Doctor!`;
      });
    return;
  }

  fetch(`${API_BASE}/auth/session.php`, {
    method: 'GET',
    credentials: 'include'
  })
    .then(response => response.json())
    .then(result => {
      if (result.success && result.data?.user_name) {
        greetingElement.textContent = `${greeting}, ${result.data.user_name}!`;
      }
    })
    .catch(() => {
      greetingElement.textContent = greeting;
    });
}

// Initialize calendar widget
function initializeCalendarWidget() {
  const calendar = document.getElementById('calendar-days');
  const monthDisplay = document.getElementById('calendar-month');
  
  if (!calendar) return;

  dashboardCalendarCurrentMonth = new Date();
  renderCalendar(dashboardCalendarCurrentMonth);
  
  // Add month/year display if not present
  if (!monthDisplay && calendar.parentElement) {
    const header = calendar.parentElement.querySelector('.calendar-header h4');
    if (header) {
      header.textContent = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  if (isAdminDashboardPage()) {
    bindAdminCalendarDayPopup();
  }
}

// Render calendar month
function renderCalendar(date = new Date()) {
  const calendar = document.getElementById('calendar-days');
  const monthDisplay = document.querySelector('.calendar-header h4');
  
  if (!calendar) return;

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  // Update month display
  if (monthDisplay) {
    monthDisplay.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const days = [];
  const currentDate = new Date(startDate);
  const today = new Date();

  while (currentDate < lastDay || currentDate.getDay() !== 0) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  calendar.innerHTML = days.map(day => {
    const isToday = day.toDateString() === today.toDateString();
    const isCurrentMonth = day.getMonth() === month;
    const dayClass = isToday ? 'today' : (isCurrentMonth ? '' : 'disabled');
    const dateKey = day.toISOString().split('T')[0];
    let dotStatuses = [];
    if (isCurrentMonth && isAdminDashboardPage()) {
      dotStatuses = adminAppointmentDotsByDate[dateKey] || [];
    } else if (isCurrentMonth && isDoctorDashboardPage()) {
      dotStatuses = doctorAppointmentDotsByDate[dateKey] || [];
    }
    const dotsMarkup = dotStatuses.slice(0, 3).map((status) => `
      <span class="day-indicator ${status}"></span>
    `).join('');
    
    return `
      <div class="calendar-day ${dayClass}" data-date="${dateKey}">
        ${day.getDate()}
        ${dotsMarkup}
      </div>
    `;
  }).join('');
}

// Initialize date navigation buttons
function initializeDateNavigation() {
  const prevBtn = document.querySelector('.calendar-nav-btn:first-child');
  const nextBtn = document.querySelector('.calendar-nav-btn:last-child');

  if (prevBtn) {
    prevBtn.addEventListener('click', async () => {
      dashboardCalendarCurrentMonth = new Date(dashboardCalendarCurrentMonth.getFullYear(), dashboardCalendarCurrentMonth.getMonth() - 1, 1);
      renderCalendar(dashboardCalendarCurrentMonth);
      if (isAdminDashboardPage()) {
        await fetchAdminCalendarMonthAppointments(dashboardCalendarCurrentMonth);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      dashboardCalendarCurrentMonth = new Date(dashboardCalendarCurrentMonth.getFullYear(), dashboardCalendarCurrentMonth.getMonth() + 1, 1);
      renderCalendar(dashboardCalendarCurrentMonth);
      if (isAdminDashboardPage()) {
        await fetchAdminCalendarMonthAppointments(dashboardCalendarCurrentMonth);
      }
    });
  }
}

// Initialize navigation with new data-section attributes
function initializeNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      const sectionId = item.getAttribute('data-section');
      const section = document.getElementById(sectionId);
      
      if (!section) return;

      // Update active state
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Update section visibility
      document.querySelectorAll('.content-section').forEach(s => {
        s.classList.remove('active');
      });
      section.classList.add('active');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Set first item as active
  if (navItems.length > 0) {
    navItems[0].classList.add('active');
    const firstSection = document.getElementById(navItems[0].getAttribute('data-section'));
    if (firstSection) {
      firstSection.classList.add('active');
    }
  }
}

// Load dashboard data based on role
function loadDashboardData() {
  const isDoctorDashboard = isDoctorDashboardPage();
  const isAdminDashboard = window.location.pathname.includes('admin-dashboard');

  if (isDoctorDashboard) {
    loadDoctorDashboardData();
  } else if (isAdminDashboard) {
    loadAdminDashboardData();
  }
}

// Check if user has access to current dashboard
function checkDashboardAccess(sessionData = null) {
  const currentPage = window.location.pathname;
  const isDoctorDashboard = currentPage.includes('doctor-dashboard');
  const isAdminDashboard = currentPage.includes('admin-dashboard');

  const role = sessionData && sessionData.data ? sessionData.data.user_role : null;

  if (isDoctorDashboard && role !== 'doctor') {
    localStorage.clear();
    window.location.replace('login.html');
    return;
  }

  if (isAdminDashboard && role !== 'admin') {
    localStorage.clear();
    window.location.replace('login.html');
  }
}

function loadAdminDashboardData() {
  Promise.all([
    fetch(`${API_BASE}/admin/stats.php`, { method: 'GET', credentials: 'include' }).then(r => r.json()),
    fetch(`${API_BASE}/admin/doctors.php`, { method: 'GET', credentials: 'include' }).then(r => r.json()),
    fetch(`${API_BASE}/admin/patients.php`, { method: 'GET', credentials: 'include' }).then(r => r.json()),
    fetch(`${API_BASE}/branches.php`, { method: 'GET', credentials: 'include' }).then(r => r.json()),
    fetch(`${API_BASE}/admin/appointments.php`, { method: 'GET', credentials: 'include' }).then(r => r.json()),
    fetch(`${API_BASE}/admin/messages.php`, { method: 'GET', credentials: 'include' })
      .then(r => r.json())
      .catch(() => ({ success: false, data: [] }))
  ])
    .then(([statsResult, doctorsResult, patientsResult, branchesResult, appointmentsResult, messagesResult]) => {
      if (!statsResult.success) throw new Error(statsResult.message || 'Failed to load stats');
      if (!doctorsResult.success) throw new Error(doctorsResult.message || 'Failed to load doctors');
      if (!patientsResult.success) throw new Error(patientsResult.message || 'Failed to load patients');
      if (!branchesResult.success) throw new Error(branchesResult.message || 'Failed to load branches');
      if (!appointmentsResult.success) throw new Error(appointmentsResult.message || 'Failed to load appointments');

      const stats = statsResult.data || {};
      const doctors = doctorsResult.data || [];
      const patients = patientsResult.data || [];
      const branches = branchesResult.data || [];
      const appointments = appointmentsResult.data || [];
      const messages = messagesResult.success ? (messagesResult.data || []) : [];
      adminDashboardState.appointments = appointments;
      adminDashboardState.doctors = doctors;
      adminMessagesState.items = messages;
      updateMessagesBadge(messages.length);
      updateNotificationBadge(appointments.filter((appointment) => appointment.status === 'pending').length);

      void initializeReportCardSummaries(stats, doctors, appointments);

      const statCards = document.querySelectorAll('.stat-value');
      if (statCards[0]) statCards[0].textContent = stats.total_doctors ?? 0;
      if (statCards[1]) statCards[1].textContent = stats.total_patients ?? 0;
      if (statCards[2]) statCards[2].textContent = stats.todays_appointments ?? 0;
      if (statCards[3]) statCards[3].textContent = stats.total_branches ?? 0;

      renderAdminRecentActivity(appointments.slice(0, 5));
      renderAdminDoctors(doctors);
      renderAdminPatients(patients);
      renderAdminBranches(branches);
      bindAdminAppointmentFilters();
      applyAdminAppointmentFilters();
      updateAdminCalendarDots(appointments);
      fetchAdminCalendarMonthAppointments(dashboardCalendarCurrentMonth);
      if (document.getElementById('messages')?.classList.contains('active')) {
        renderAdminMessages(messages);
      }

      initializeReportDownloads();
      animateStatCards();
    })
    .catch(error => {
      console.error('Error loading admin dashboard data:', error);
    });
}

function setReportCardSummary(key, value, note) {
  const valueElement = document.getElementById(`${key}-report-count`);
  const noteElement = document.getElementById(`${key}-report-note`);

  if (valueElement) {
    valueElement.textContent = value;
  }

  if (noteElement) {
    noteElement.textContent = note;
  }
}

function formatCurrencyAed(value) {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

async function initializeReportCardSummaries(stats, doctors, appointments) {
  const currentMonth = formatYearMonth(new Date());
  const appointmentsThisMonth = appointments.filter((appointment) => {
    return formatYearMonth(new Date(`${appointment.appointment_date}T00:00:00`)) === currentMonth;
  }).length;

  setReportCardSummary(
    'monthly-appointments',
    String(appointmentsThisMonth),
    `${appointmentsThisMonth} appointments this month`
  );

  setReportCardSummary(
    'doctor-performance',
    String(doctors.length),
    `${doctors.length} doctors included in export`
  );

  try {
    const [revenueResult, demographicsResult] = await Promise.all([
      fetchJson(`${API_BASE}/admin/reports.php?type=revenue`),
      fetchJson(`${API_BASE}/admin/reports.php?type=patient-demographics`)
    ]);

    if (revenueResult.success && revenueResult.data) {
      const rows = Array.isArray(revenueResult.data.rows) ? revenueResult.data.rows : [];
      const currentMonthRow = rows.find((row) => row[0] === currentMonth) || rows[0] || [];
      const estimatedRevenue = Number(currentMonthRow[1] || 0);
      setReportCardSummary(
        'revenue',
        formatCurrencyAed(estimatedRevenue),
        `Current month estimate from ${rows.length} monthly row${rows.length === 1 ? '' : 's'}`
      );
    } else {
      setReportCardSummary('revenue', 'AED 0', 'Revenue data unavailable');
    }

    if (demographicsResult.success && demographicsResult.data) {
      const rows = Array.isArray(demographicsResult.data.rows) ? demographicsResult.data.rows : [];
      setReportCardSummary(
        'patient-demographics',
        String(rows.length),
        'Age groups and gender segments exported'
      );
    } else {
      setReportCardSummary('patient-demographics', '0', 'Demographics data unavailable');
    }
  } catch (error) {
    console.error('Failed to load report summaries:', error);
    setReportCardSummary('revenue', 'AED 0', 'Revenue data unavailable');
    setReportCardSummary('patient-demographics', '0', 'Demographics data unavailable');
  }
}

function loadDoctorDashboardData() {
  fetch(`${API_BASE}/doctor/dashboard.php`, {
    method: 'GET',
    credentials: 'include'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load doctor dashboard data');
    }
    return response.json();
  })
  .then(result => {
    if (!result.success) {
      throw new Error(result.message || 'Failed to load doctor dashboard data');
    }

    const data = result.data;

    const statCards = document.querySelectorAll('.stat-value');
    if (statCards[0]) statCards[0].textContent = data.stats?.todays_appointments ?? 0;
    if (statCards[1]) statCards[1].textContent = data.stats?.total_patients ?? 0;
    if (statCards[2]) statCards[2].textContent = data.stats?.pending_confirmations ?? 0;

    const subtitleElement = document.querySelector('#header-subtitle');
    if (subtitleElement) {
      const count = Number(data.stats?.todays_appointments ?? 0);
      subtitleElement.textContent = `You have ${count} appointment${count !== 1 ? 's' : ''} today`;
    }
    updateNotificationBadge(data.stats?.pending_confirmations ?? 0);

    renderDoctorRecentPatients(data.patients?.slice(0, 5) || []);
    renderDoctorAppointments(data.appointments || []);

    animateStatCards();
  })
  .catch(error => {
    console.error('Error loading doctor dashboard data:', error);
  });
}

function renderAdminRecentActivity(items) {
  const tbody = document.getElementById('recent-activity-tbody');
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1rem; color:#6B7280;">No recent activity</td></tr>';
    return;
  }

  tbody.innerHTML = items.slice(0, 5).map((item) => `
    <tr>
      <td>
        <div class="patient-cell">
          <div class="patient-avatar">${(item.patient_name || 'A').charAt(0).toUpperCase()}</div>
          <div class="patient-info">
            <div class="patient-name">${item.patient_name || 'Unknown'}</div>
            <div class="patient-age">${item.doctor_name || 'Appointment activity'}</div>
          </div>
        </div>
      </td>
      <td>${formatDate(item.appointment_date)} ${formatTime(item.appointment_time)}</td>
      <td><span class="badge ${statusBadgeClass(item.status)}">${capitalize(item.status)}</span></td>
      <td>${item.branch || 'N/A'}</td>
    </tr>
  `).join('');
}

function renderAdminDoctors(doctors) {
  const tbody = document.getElementById('admin-doctors-body');
  const countLabel = document.getElementById('admin-doctors-count');
  if (!tbody) return;

  if (countLabel) {
    const total = Array.isArray(doctors) ? doctors.length : 0;
    countLabel.textContent = `Showing ${total} doctor${total === 1 ? '' : 's'}`;
  }

  if (!doctors.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No doctors found</td></tr>';
    return;
  }

  tbody.innerHTML = doctors.map((doctor) => `
    <tr>
      <td>${doctor.full_name || 'N/A'}</td>
      <td>${doctor.specialty || 'N/A'}</td>
      <td>${doctor.branch || 'N/A'}</td>
      <td><span class="badge ${doctor.is_active ? 'badge-confirmed' : 'badge-cancelled'}">${doctor.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <a class="btn-small" href="admin-add-doctor.html?doctor_id=${doctor.id}">Edit</a>
        <button class="btn-small btn-toggle-doctor" data-id="${doctor.id}" data-active="${doctor.is_active ? '1' : '0'}" style="margin-left:8px; background:${doctor.is_active ? '#EF4444' : '#22c55e'};">${doctor.is_active ? 'Deactivate' : 'Activate'}</button>
      </td>
    </tr>
  `).join('');

  bindDoctorStatusButtons();
}

function renderAdminPatients(patients) {
  const tbody = document.getElementById('admin-patients-body');
  if (!tbody) return;

  if (!patients.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No patients found</td></tr>';
    return;
  }

  tbody.innerHTML = patients.map((patient) => `
    <tr data-patient-id="${patient.id}">
      <td>
        <div class="patient-cell">
          <div class="patient-avatar">${(patient.full_name || 'P').charAt(0).toUpperCase()}</div>
          <div class="patient-info">
            <div class="patient-name">${patient.full_name || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td>${patient.email || 'N/A'}</td>
      <td>${patient.phone || 'N/A'}</td>
      <td>${formatDate(patient.created_at) || 'N/A'}</td>
      <td><button class="btn-small btn-delete-patient" data-id="${patient.id}">Delete</button></td>
    </tr>
  `).join('');

  bindPatientDeleteButtons();
}

function renderAdminBranches(branches) {
  const tbody = document.getElementById('admin-branches-body');
  if (!tbody) return;

  if (!branches.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No branches found</td></tr>';
    return;
  }

  tbody.innerHTML = branches.map((branch) => `
    <tr>
      <td>${branch.name || 'N/A'}</td>
      <td>${branch.address || 'N/A'}</td>
      <td>${branch.doctor_count ?? 0}</td>
      <td>${branch.appointment_count ?? 0}</td>
      <td><a class="btn-small" href="admin-add-branch.html?branch_id=${branch.id}">Edit Branch</a></td>
    </tr>
  `).join('');
}

function renderAdminAppointments(appointments) {
  const tbody = document.getElementById('admin-appointments-body');
  if (!tbody) return;

  if (!appointments.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No appointments found</td></tr>';
    return;
  }

  tbody.innerHTML = appointments.map((appointment) => `
    <tr>
      <td>${appointment.patient_name || 'N/A'}</td>
      <td>${appointment.doctor_name || 'N/A'}</td>
      <td>${appointment.branch || 'N/A'}</td>
      <td>${formatDate(appointment.appointment_date)} ${formatTime(appointment.appointment_time)}</td>
      <td><span class="badge ${statusBadgeClass(appointment.status)}">${capitalize(appointment.status)}</span></td>
    </tr>
  `).join('');
}

function getAdminAppointmentFilteredRows() {
  const status = (document.getElementById('admin-appointment-status-filter')?.value || 'all').toLowerCase();
  const branch = document.getElementById('admin-appointment-branch-filter')?.value || 'all';
  const date = document.getElementById('admin-appointment-date-filter')?.value || '';

  return adminDashboardState.appointments.filter((appointment) => {
    if (status !== 'all' && String(appointment.status || '').toLowerCase() !== status) return false;
    if (branch !== 'all' && String(appointment.branch || '') !== branch) return false;
    if (date && String(appointment.appointment_date || '') !== date) return false;
    return true;
  });
}

function populateAdminAppointmentBranchFilter() {
  const branchFilter = document.getElementById('admin-appointment-branch-filter');
  if (!branchFilter) return;

  const current = branchFilter.value || 'all';
  const branches = Array.from(new Set(adminDashboardState.appointments.map((item) => item.branch).filter(Boolean))).sort();

  branchFilter.innerHTML = '<option value="all">All Branches</option>';
  branches.forEach((branch) => {
    const option = document.createElement('option');
    option.value = branch;
    option.textContent = branch;
    branchFilter.appendChild(option);
  });

  if (Array.from(branchFilter.options).some((opt) => opt.value === current)) {
    branchFilter.value = current;
  }
}

function applyAdminAppointmentFilters() {
  populateAdminAppointmentBranchFilter();
  const rows = getAdminAppointmentFilteredRows();
  renderAdminAppointments(rows);
}

function bindAdminAppointmentFilters() {
  if (adminDashboardState.filtersBound) return;

  const status = document.getElementById('admin-appointment-status-filter');
  const branch = document.getElementById('admin-appointment-branch-filter');
  const date = document.getElementById('admin-appointment-date-filter');

  [status, branch, date].forEach((input) => {
    input?.addEventListener('input', applyAdminAppointmentFilters);
    input?.addEventListener('change', applyAdminAppointmentFilters);
  });

  adminDashboardState.filtersBound = true;
}

function bindDoctorStatusButtons() {
  document.querySelectorAll('.btn-toggle-doctor').forEach((button) => {
    button.addEventListener('click', async () => {
      const doctorId = Number(button.dataset.id || 0);
      const active = button.dataset.active === '1';
      const row = button.closest('tr');
      const badge = row?.querySelector('.badge');
      if (!doctorId) return;

      button.disabled = true;
      button.textContent = 'Saving...';

      try {
        const response = await fetch(`${API_BASE}/admin/doctors.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ doctor_id: doctorId, is_active: active ? 0 : 1 })
        });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Failed to update doctor status');
        }

        const nowActive = !active;
        button.dataset.active = nowActive ? '1' : '0';
        button.disabled = false;
        button.textContent = nowActive ? 'Deactivate' : 'Activate';
        button.style.background = nowActive ? '#EF4444' : '#22c55e';

        if (badge) {
          badge.className = `badge ${nowActive ? 'badge-confirmed' : 'badge-cancelled'}`;
          badge.textContent = nowActive ? 'Active' : 'Inactive';
        }
      } catch (error) {
        console.error('Doctor status update failed:', error);
        button.disabled = false;
        button.textContent = active ? 'Deactivate' : 'Activate';
      }
    });
  });
}

function bindPatientDeleteButtons() {
  document.querySelectorAll('.btn-delete-patient').forEach((button) => {
    button.addEventListener('click', async () => {
      const patientId = Number(button.dataset.id || 0);
      const row = button.closest('tr');
      if (!patientId || !row) return;

      if (button.dataset.confirming !== '1') {
        button.dataset.confirming = '1';
        const originalLabel = button.textContent;
        button.dataset.originalLabel = originalLabel;
        button.textContent = 'Confirm';
        button.style.background = '#EF4444';

        const hint = document.createElement('span');
        hint.className = 'delete-confirm-hint';
        hint.textContent = 'Are you sure?';
        hint.style.marginRight = '8px';
        hint.style.color = '#6B7280';
        hint.style.fontSize = '12px';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-small btn-delete-cancel';
        cancelButton.textContent = 'Cancel';
        cancelButton.style.marginLeft = '8px';
        cancelButton.dataset.patientId = String(patientId);
        button.before(hint);
        button.after(cancelButton);

        cancelButton.addEventListener('click', () => {
          button.dataset.confirming = '0';
          button.textContent = button.dataset.originalLabel || 'Delete';
          button.style.background = '';
          const inlineHint = row.querySelector('.delete-confirm-hint');
          if (inlineHint) inlineHint.remove();
          cancelButton.remove();
        });

        return;
      }

      button.disabled = true;
      button.textContent = 'Deleting...';
      const cancelBtn = row.querySelector('.btn-delete-cancel');
      if (cancelBtn) cancelBtn.remove();
      const inlineHint = row.querySelector('.delete-confirm-hint');
      if (inlineHint) inlineHint.remove();

      try {
        const response = await fetch(`${API_BASE}/admin/patients.php`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ patient_id: patientId })
        });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Failed to delete patient');
        }

        row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        row.style.opacity = '0';
        row.style.transform = 'translateX(-16px)';
        setTimeout(() => {
          row.remove();
        }, 320);
      } catch (error) {
        console.error('Delete patient failed:', error);
        button.disabled = false;
        button.dataset.confirming = '0';
        button.textContent = button.dataset.originalLabel || 'Delete';
        button.style.background = '';
      }
    });
  });
}

function updateAdminCalendarDots(appointments) {
  adminAppointmentDotsByDate = {};
  adminAppointmentsByDate = {};

  appointments.forEach((appointment) => {
    const dateKey = appointment.appointment_date;
    if (!dateKey) return;

    if (!adminAppointmentDotsByDate[dateKey]) {
      adminAppointmentDotsByDate[dateKey] = [];
    }

    if (!adminAppointmentsByDate[dateKey]) {
      adminAppointmentsByDate[dateKey] = [];
    }

    let normalizedStatus = appointment.status;
    if (normalizedStatus === 'completed' || normalizedStatus === 'confirmed') {
      normalizedStatus = 'confirmed-blue';
    }
    if (normalizedStatus === 'pending') normalizedStatus = 'pending';
    if (normalizedStatus === 'cancelled') normalizedStatus = 'cancelled';

    if (!adminAppointmentDotsByDate[dateKey].includes(normalizedStatus)) {
      adminAppointmentDotsByDate[dateKey].push(normalizedStatus);
    }

    adminAppointmentsByDate[dateKey].push({
      patient_name: appointment.patient_name || 'N/A',
      doctor_name: appointment.doctor_name || 'N/A',
      appointment_time: appointment.appointment_time || '',
      status: appointment.status || 'pending'
    });
  });

  renderCalendar(dashboardCalendarCurrentMonth);
}

async function fetchAdminCalendarMonthAppointments(targetDate) {
  try {
    const month = formatYearMonth(targetDate);
    const result = await fetchJson(`${API_BASE}/admin/appointments.php?month=${encodeURIComponent(month)}`);
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch month appointments');
    }
    updateAdminCalendarDots(result.data || []);
  } catch (error) {
    console.error('Failed to fetch admin calendar month data:', error);
  }
}

function closeAdminCalendarPopup() {
  if (!adminCalendarPopupElement) return;
  adminCalendarPopupElement.style.display = 'none';
}

function bindAdminCalendarDayPopup() {
  const calendar = document.getElementById('calendar-days');
  const calendarCard = document.querySelector('.calendar-card');
  if (!calendar || !calendarCard) return;

  if (!adminCalendarPopupElement) {
    adminCalendarPopupElement = document.createElement('div');
    adminCalendarPopupElement.id = 'admin-calendar-day-popup';
    adminCalendarPopupElement.style.cssText = 'display:none; position:absolute; right:12px; bottom:12px; width:min(92vw, 300px); max-height:280px; overflow:auto; background:var(--color-bg); border:1px solid var(--color-border); border-radius:10px; box-shadow:0 12px 28px rgba(0,0,0,0.22); padding:10px; z-index:50;';
    calendarCard.style.position = 'relative';
    calendarCard.appendChild(adminCalendarPopupElement);
  }

  if (!calendar.dataset.popupBound) {
    calendar.dataset.popupBound = '1';

    calendar.addEventListener('click', (event) => {
      const day = event.target.closest('.calendar-day');
      if (!day) return;

      const dateKey = day.getAttribute('data-date') || '';
      const items = adminAppointmentsByDate[dateKey] || [];
      if (!items.length) {
        closeAdminCalendarPopup();
        return;
      }

      const list = items.map((item) => `
        <div style="padding:8px 0; border-bottom:1px solid var(--color-border);">
          <div style="font-weight:600; color:var(--text-primary);">${item.patient_name}</div>
          <div style="font-size:12px; color:#6B7280;">${item.doctor_name} · ${formatTime(item.appointment_time)}</div>
          <div style="font-size:12px; color:#6B7280; text-transform:capitalize;">${item.status}</div>
        </div>
      `).join('');

      adminCalendarPopupElement.innerHTML = `
        <div style="font-weight:700; margin-bottom:8px; color:var(--text-primary);">${formatDate(dateKey)}</div>
        ${list}
      `;
      adminCalendarPopupElement.style.display = 'block';
    });

    document.addEventListener('click', (event) => {
      if (!adminCalendarPopupElement || adminCalendarPopupElement.style.display === 'none') return;
      if (adminCalendarPopupElement.contains(event.target)) return;
      if (calendar.contains(event.target)) return;
      closeAdminCalendarPopup();
    });
  }
}

function renderDoctorRecentPatients(patients) {
  const tbody = document.querySelector('#overview .patients-table tbody');
  if (!tbody) return;

  if (!patients.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No patients found</td></tr>';
    return;
  }

  tbody.innerHTML = patients.map((patient, index) => `
    <tr>
      <td>
        <div class="patient-cell">
          <div class="patient-avatar">${(patient.full_name || 'P').charAt(0).toUpperCase()}</div>
          <div class="patient-info">
            <div class="patient-name">${patient.full_name || 'N/A'}</div>
            <div class="patient-age">Age: ${patient.age || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td>${formatDate(patient.last_visit) || 'N/A'}</td>
      <td><span class="badge badge-completed">Visited</span></td>
    </tr>
  `).join('');
}

function renderDoctorAppointments(appointments) {
  const tbody = document.querySelector('#appointments .patients-table tbody');
  if (!tbody) return;

  if (!appointments.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No appointments found</td></tr>';
    return;
  }

  tbody.innerHTML = appointments.map((appointment) => `
    <tr>
      <td>
        <div class="patient-cell">
          <div class="patient-avatar">${(appointment.patient_name || 'P').charAt(0).toUpperCase()}</div>
          <div class="patient-info">
            <div class="patient-name">${appointment.patient_name || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td>${formatDate(appointment.date) || 'N/A'}</td>
      <td>${formatTime(appointment.time) || 'N/A'}</td>
      <td><span class="badge ${statusBadgeClass(appointment.status)}">${capitalize(appointment.status)}</span></td>
    </tr>
  `).join('');
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 'N/A';
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 'N/A';

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age >= 0 ? age : 'N/A';
}

function renderPatientsSkeletonLoaders() {
  const tbody = document.getElementById('patients-tbody');
  if (!tbody) return;

  const skeletonRows = Array.from({ length: 4 }).map(() => `
    <tr>
      <td>
        <div class="patient-cell">
          <div class="patient-avatar" style="opacity: 0.5;">..</div>
          <div class="patient-info">
            <div class="patient-name" style="opacity: 0.5;">Loading patient...</div>
            <div class="patient-age" style="opacity: 0.45;">Preparing records</div>
          </div>
        </div>
      </td>
      <td style="opacity: 0.5;">...</td>
      <td style="opacity: 0.5;">...</td>
      <td style="opacity: 0.5;">...</td>
      <td style="opacity: 0.5;">...</td>
      <td style="opacity: 0.5;">...</td>
    </tr>
  `).join('');

  tbody.innerHTML = skeletonRows;
}

function renderDoctorPatients(patients) {
  const tbody = document.getElementById('patients-tbody');
  if (!tbody) return;

  if (!Array.isArray(patients) || patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#6B7280;">No patients yet</td></tr>';
    return;
  }

  tbody.innerHTML = patients.map((patient) => {
    const age = calculateAge(patient.date_of_birth);
    const ageText = age === 'N/A' ? 'Age unavailable' : `${age} years`;
    const initials = (patient.full_name || 'P')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'P';

    return `
      <tr>
        <td>
          <div class="patient-cell">
            <div class="patient-avatar">${initials}</div>
            <div class="patient-info">
              <div class="patient-name">${patient.full_name || 'N/A'}</div>
              <div class="patient-age">${ageText}</div>
            </div>
          </div>
        </td>
        <td>P-${String(patient.id || '').padStart(5, '0')}</td>
        <td>${patient.insurance_company || 'No Insurance'}</td>
        <td>${formatDate(patient.last_visit) || 'N/A'}</td>
        <td>${patient.phone || 'N/A'}</td>
        <td><button class="btn-small" type="button">View Profile</button></td>
      </tr>
    `;
  }).join('');
}

async function loadDoctorPatientsTab() {
  if (!isDoctorDashboardPage()) return;

  renderPatientsSkeletonLoaders();

  try {
    const response = await fetch(`${API_BASE}/doctor/patients.php`, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to load patients');
    }

    renderDoctorPatients(result.data || []);
  } catch (error) {
    console.error('Error loading doctor patients:', error);
    const tbody = document.getElementById('patients-tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#EF4444;">Could not load patients. Please try again.</td></tr>';
    }
  }
}

function renderScheduleSkeleton() {
  const timeline = document.getElementById('schedule-timeline');
  if (!timeline) return;

  timeline.innerHTML = Array.from({ length: 5 }).map((_, index) => `
    <div class="schedule-time-column">
      <div class="schedule-time" style="opacity: 0.5;">Loading day ${index + 1}...</div>
      <div class="appointment-block" style="opacity: 0.45;">Fetching appointments...</div>
    </div>
  `).join('');
}

function statusToColor(status) {
  if (status === 'confirmed') return 'linear-gradient(135deg, #10b981, #059669)';
  if (status === 'pending') return 'linear-gradient(135deg, #f59e0b, #d97706)';
  return 'var(--color-primary-gradient)';
}

function renderDoctorSchedule(days) {
  const timeline = document.getElementById('schedule-timeline');
  if (!timeline) return;

  if (!Array.isArray(days) || days.length === 0) {
    timeline.innerHTML = '<div style="color:#6B7280;">No appointments</div>';
    return;
  }

  timeline.innerHTML = days.map((day) => {
    const header = `${day.day}, ${formatDate(day.date)}`;
    const blocks = (day.appointments || []).map((appointment) => `
      <div class="appointment-block" style="background:${statusToColor(appointment.status)};">
        <div style="font-weight:600; margin-bottom:2px;">${appointment.patient_name || 'Patient'}</div>
        <div>${formatTime(appointment.appointment_time) || appointment.appointment_time}</div>
        <div style="text-transform:capitalize; opacity:0.95;">${appointment.status || 'pending'}</div>
      </div>
    `).join('');

    return `
      <div class="schedule-time-column">
        <div class="schedule-time">${header}</div>
        ${blocks || '<div style="color:#6B7280; font-size:12px; margin-top:8px;">No appointments</div>'}
      </div>
    `;
  }).join('');
}

async function loadDoctorScheduleTab() {
  if (!isDoctorDashboardPage()) return;

  renderScheduleSkeleton();

  try {
    const response = await fetch(`${API_BASE}/doctor/schedule.php`, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to load schedule');
    }

    renderDoctorSchedule(result.data?.days || []);
  } catch (error) {
    console.error('Error loading doctor schedule:', error);
    const timeline = document.getElementById('schedule-timeline');
    if (timeline) {
      timeline.innerHTML = '<div style="color:#EF4444;">Could not load schedule. Please try again.</div>';
    }
  }
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return 'N/A';
  try {
    const date = new Date(`1970-01-01T${value}`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return value;
  }
}

function formatRelativeTime(value) {
  if (!value) return 'recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

function statusBadgeClass(status) {
  if (status === 'confirmed') return 'badge-confirmed';
  if (status === 'pending') return 'badge-pending';
  if (status === 'cancelled') return 'badge-cancelled';
  if (status === 'completed') return 'badge-completed';
  return 'badge-pending';
}

function capitalize(value) {
  if (!value) return 'Unknown';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Add transition classes to sections
function addSectionTransitions() {
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(section => {
    section.classList.add('section-transition');
  });
}

// Animate stat cards with count-up effect
function animateStatCards() {
  const statNumbers = document.querySelectorAll('.stat-value');
  
  statNumbers.forEach(stat => {
    const text = stat.textContent.trim();
    const isPercentage = text.includes('%');
    const numericValue = parseInt(text.replace(/\D/g, ''));
    
    if (isNaN(numericValue)) return;
    
    // Animate count up
    animateCountUp(stat, 0, numericValue, 1500, isPercentage);
  });
}

// Count up animation helper
function animateCountUp(element, start, end, duration, isPercentage = false) {
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out quad
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (end - start) * easeProgress);
    
    element.textContent = isPercentage ? `${current}%` : current;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = isPercentage ? `${end}%` : end;
    }
  }
  
  requestAnimationFrame(update);
}

// Sidebar Navigation with smooth transitions
function initializeSidebarNavigation() {
  const navItems = document.querySelectorAll('.nav-item:not(.logout)');
  const sections = document.querySelectorAll('.content-section');
  const wrapper = document.querySelector('.dashboard-wrapper');
  const overlay = document.querySelector('.dashboard-sidebar-overlay');

  const closeMobileSidebar = () => {
    if (!wrapper) return;
    wrapper.classList.remove('sidebar-open');
    if (overlay) {
      overlay.classList.remove('active');
    }
  };

  navItems.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Get the section to show
      const sectionId = link.dataset.section;

      if (isDoctorDashboardPage() && sectionId === 'patients') {
        loadDoctorPatientsTab();
      }

      if (isDoctorDashboardPage() && sectionId === 'schedule') {
        loadDoctorScheduleTab();
      }

      if (isAdminDashboardPage()) {
        if (sectionId === 'doctors' || sectionId === 'patients' || sectionId === 'branches' || sectionId === 'appointments' || sectionId === 'overview') {
          loadAdminDashboardData();
        } else if (sectionId === 'messages') {
          loadAdminMessages();
        }
      }

      // Update active state on nav links
      navItems.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Hide all sections with fade out
      sections.forEach(section => {
        if (section.id !== sectionId && section.classList.contains('active')) {
          section.classList.add('section-hidden');
          section.classList.remove('section-visible');
          
          setTimeout(() => {
            section.classList.remove('active');
          }, 300);
        }
      });

      // Show target section with fade in
      setTimeout(() => {
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
          targetSection.classList.add('active');
          targetSection.classList.remove('section-hidden');
          targetSection.classList.add('section-visible');
        }
      }, 300);

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (window.innerWidth <= 768) {
        closeMobileSidebar();
      }
    });
  });

  // Logout link handler
  const logoutLink = document.querySelector('.nav-item.logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (event) => {
      event.preventDefault();
      await performDashboardLogout();
    });
  }
}

function initializeAdminMobileSidebar() {
  const isAdminDashboard = window.location.pathname.includes('admin-dashboard');
  if (!isAdminDashboard) return;

  const wrapper = document.querySelector('.dashboard-wrapper');
  const sidebar = document.querySelector('.dashboard-sidebar');
  if (!wrapper || !sidebar) return;

  let overlay = document.querySelector('.dashboard-sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'dashboard-sidebar-overlay';
    document.body.appendChild(overlay);
  }

  let hamburgerButton = document.querySelector('.dashboard-hamburger-btn');
  if (!hamburgerButton) {
    hamburgerButton = document.createElement('button');
    hamburgerButton.type = 'button';
    hamburgerButton.className = 'dashboard-hamburger-btn';
    hamburgerButton.setAttribute('aria-label', 'Open sidebar menu');
    hamburgerButton.textContent = '☰';
    document.body.appendChild(hamburgerButton);
  }

  let closeButton = sidebar.querySelector('.dashboard-sidebar-close-btn');
  if (!closeButton) {
    closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'dashboard-sidebar-close-btn';
    closeButton.setAttribute('aria-label', 'Close sidebar menu');
    closeButton.textContent = '✕';
    sidebar.appendChild(closeButton);
  }

  const openSidebar = () => {
    if (window.innerWidth > 768) return;
    wrapper.classList.add('sidebar-open');
    overlay.classList.add('active');
  };

  const closeSidebar = () => {
    wrapper.classList.remove('sidebar-open');
    overlay.classList.remove('active');
  };

  hamburgerButton.addEventListener('click', openSidebar);
  closeButton.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);

  sidebar.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeSidebar();
    }
  });
}

// Doctor Dashboard - Schedule Toggles with smooth animation
function initializeDoctorSchedule() {
  const timeSlots = document.querySelectorAll('.time-slot');

  timeSlots.forEach(slot => {
    // Add smooth transition class
    slot.classList.add('smooth-color-transition');
    
    slot.addEventListener('click', () => {
      // Toggle between available and blocked with animation
      if (slot.classList.contains('available')) {
        slot.classList.remove('available');
        slot.classList.add('blocked');
      } else {
        slot.classList.remove('blocked');
        slot.classList.add('available');
      }
    });
  });
}

// Admin Dashboard - Manage Doctors and Patients
function initializeAdminControls() {
  initializeDeactivateButtons();
  initializeDeleteButtons();
}

// Admin - Deactivate/Activate Doctor Toggle with smooth animation
function initializeDeactivateButtons() {
  const deactivateButtons = document.querySelectorAll('.btn-deactivate');

  deactivateButtons.forEach(button => {
    button.addEventListener('click', () => {
      const row = button.closest('tr');
      const statusBadge = row.querySelector('.badge');
      
      // Add smooth transition
      statusBadge.classList.add('smooth-color-transition');
      
      // Show loading state
      button.classList.add('btn-loading');

      setTimeout(() => {
        button.classList.remove('btn-loading');
        
        if (statusBadge.classList.contains('badge-active')) {
          // Change to Inactive
          statusBadge.classList.remove('badge-active');
          statusBadge.classList.add('badge-inactive');
          statusBadge.textContent = 'Inactive';
          button.textContent = 'Activate';
        } else {
          // Change to Active
          statusBadge.classList.remove('badge-inactive');
          statusBadge.classList.add('badge-active');
          statusBadge.textContent = 'Active';
          button.textContent = 'Deactivate';
        }
      }, 800);
    });
  });
}

// Admin - Delete Patient with fade-out animation
function initializeDeleteButtons() {
  const deleteButtons = document.querySelectorAll('.btn-delete');

  deleteButtons.forEach(button => {
    button.addEventListener('click', () => {
      const row = button.closest('tr');
      const patientName = row.cells[0].textContent;

      // Create inline confirmation
      const confirmationDiv = document.createElement('div');
      confirmationDiv.className = 'fade-in';
      confirmationDiv.style.position = 'fixed';
      confirmationDiv.style.top = '50%';
      confirmationDiv.style.left = '50%';
      confirmationDiv.style.transform = 'translate(-50%, -50%)';
      confirmationDiv.style.backgroundColor = 'white';
      confirmationDiv.style.padding = '2rem';
      confirmationDiv.style.borderRadius = '0.75rem';
      confirmationDiv.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.2)';
      confirmationDiv.style.zIndex = '10000';
      confirmationDiv.style.maxWidth = '400px';
      confirmationDiv.style.textAlign = 'center';

      confirmationDiv.innerHTML = `
        <h3 style="margin-bottom: 1rem; color: #1A1A2E;">Confirm Deletion</h3>
        <p style="margin-bottom: 1.5rem; color: #6B7280;">Are you sure you want to delete ${patientName}? This action cannot be undone.</p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button class="confirm-delete-btn" style="background-color: #EF4444; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600; transition: all 0.3s ease;">Delete</button>
          <button class="cancel-delete-btn" style="background-color: #E5E7EB; color: #1A1A2E; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600; transition: all 0.3s ease;">Cancel</button>
        </div>
      `;

      // Create overlay with fade in
      const overlay = document.createElement('div');
      overlay.className = 'fade-in';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      overlay.style.zIndex = '9999';

      document.body.appendChild(overlay);
      document.body.appendChild(confirmationDiv);

      // Handle confirm - fade out row before removing
      confirmationDiv.querySelector('.confirm-delete-btn').addEventListener('click', () => {
        // Show loading on delete button
        const deleteBtn = confirmationDiv.querySelector('.confirm-delete-btn');
        deleteBtn.classList.add('btn-loading');
        
        setTimeout(() => {
          // Fade out the row
          row.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          row.style.opacity = '0';
          row.style.transform = 'translateX(-20px)';
          
          // Remove after animation
          setTimeout(() => {
            row.remove();
          }, 400);
          
          // Close modal
          overlay.classList.add('fade-out');
          confirmationDiv.classList.add('fade-out');
          setTimeout(() => {
            overlay.remove();
            confirmationDiv.remove();
          }, 400);
        }, 1000);
      });

      // Handle cancel - fade out modal
      const cancelHandler = () => {
        overlay.classList.add('fade-out');
        confirmationDiv.classList.add('fade-out');
        setTimeout(() => {
          overlay.remove();
          confirmationDiv.remove();
        }, 400);
      };

      confirmationDiv.querySelector('.cancel-delete-btn').addEventListener('click', cancelHandler);
      overlay.addEventListener('click', cancelHandler);
    });
  });
}

// Reports - Download CSV from backend data
function initializeReportDownloads() {
  const downloadButtons = document.querySelectorAll('.download-btn');

  downloadButtons.forEach(button => {
    if (button.dataset.bound === '1') {
      return;
    }
    button.dataset.bound = '1';

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const reportType = button.dataset.reportType || '';

      if (!reportType) {
        console.error('Unknown report type for download button');
        return;
      }

      // Add loading state
      const originalText = button.textContent;
      button.classList.add('btn-loading');
      button.disabled = true;

      try {
        let fileName = `${reportType.replace(/\s/g, '_').toLowerCase()}.csv`;
        let csvContent = '';

        if (reportType === 'monthly-appointments') {
          const month = formatYearMonth(new Date());
          const result = await fetchJson(`${API_BASE}/admin/appointments.php?month=${encodeURIComponent(month)}`);
          if (!result.success) {
            throw new Error(result.message || 'Failed to fetch monthly appointments');
          }

          const columns = ['Patient Name', 'Doctor', 'Specialty', 'Branch', 'Date', 'Time', 'Status'];
          const rows = (result.data || []).map((item) => [
            item.patient_name || '',
            item.doctor_name || '',
            item.specialty || '',
            item.branch || '',
            item.appointment_date || '',
            item.appointment_time || '',
            item.status || ''
          ]);
          csvContent = convertRowsToCsv(columns, rows);
          fileName = `monthly_appointments_${month}.csv`;
        } else if (reportType === 'doctor-performance') {
          const [doctorsResult, appointmentsResult] = await Promise.all([
            fetchJson(`${API_BASE}/admin/doctors.php`),
            fetchJson(`${API_BASE}/admin/appointments.php`)
          ]);

          if (!doctorsResult.success) {
            throw new Error(doctorsResult.message || 'Failed to fetch doctors');
          }
          if (!appointmentsResult.success) {
            throw new Error(appointmentsResult.message || 'Failed to fetch appointments');
          }

          const doctors = Array.isArray(doctorsResult.data) ? doctorsResult.data : [];
          const appointments = Array.isArray(appointmentsResult.data) ? appointmentsResult.data : [];
          const statsByDoctor = new Map();

          doctors.forEach((doctor) => {
            statsByDoctor.set(String(doctor.id), {
              doctor_name: doctor.full_name || '',
              specialty: doctor.specialty || '',
              branch: doctor.branch || '',
              is_active: doctor.is_active ? 'Active' : 'Inactive',
              total_appointments: 0,
              pending: 0,
              confirmed: 0,
              completed: 0,
              cancelled: 0
            });
          });

          appointments.forEach((appointment) => {
            const matchedDoctor = doctors.find((doctor) => String(doctor.id) === String(appointment.doctor_id))
              || doctors.find((doctor) => doctor.full_name === appointment.doctor_name);
            if (!matchedDoctor) return;
            const stats = statsByDoctor.get(String(matchedDoctor.id));
            if (!stats) return;

            stats.total_appointments += 1;
            if (appointment.status === 'pending') stats.pending += 1;
            if (appointment.status === 'confirmed') stats.confirmed += 1;
            if (appointment.status === 'completed') stats.completed += 1;
            if (appointment.status === 'cancelled') stats.cancelled += 1;
          });

          const columns = [
            'Doctor Name',
            'Specialty',
            'Branch',
            'Account Status',
            'Total Appointments',
            'Pending',
            'Confirmed',
            'Completed',
            'Cancelled'
          ];
          const rows = Array.from(statsByDoctor.values()).map((stats) => [
            stats.doctor_name,
            stats.specialty,
            stats.branch,
            stats.is_active,
            String(stats.total_appointments),
            String(stats.pending),
            String(stats.confirmed),
            String(stats.completed),
            String(stats.cancelled)
          ]);

          csvContent = convertRowsToCsv(columns, rows);
          fileName = 'doctor_performance_report.csv';
        } else if (reportType === 'revenue' || reportType === 'patient-demographics') {
          const result = await fetchJson(`${API_BASE}/admin/reports.php?type=${encodeURIComponent(reportType)}`);
          if (!result.success || !result.data) {
            throw new Error(result.message || 'Report generation failed');
          }

          csvContent = convertRowsToCsv(result.data.columns || [], result.data.rows || []);
          fileName = result.data.fileName || fileName;
        } else {
          const result = await fetchJson(`${API_BASE}/admin/reports.php?type=${encodeURIComponent(reportType)}`);
          if (!result.success || !result.data) {
            throw new Error(result.message || 'Report generation failed');
          }

          csvContent = convertRowsToCsv(result.data.columns || [], result.data.rows || []);
          fileName = result.data.fileName || fileName;
        }

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

      } catch (error) {
        console.error('Report download error:', error);
      } finally {
        button.classList.remove('btn-loading');
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  });
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function convertRowsToCsv(columns, rows) {
  const header = columns.map(csvEscape).join(',');
  const lines = rows.map((row) => row.map(csvEscape).join(','));
  return [header, ...lines].join('\n');
}

