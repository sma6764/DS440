// Dashboard.js - Enhanced with smooth animations and interactions

const API_BASE = window.API_BASE || 'http://localhost/check-me-up/backend/api';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setHeaderGreeting();
  initializeAdminMobileSidebar();
  initializeNavigation();
  initializeSidebarNavigation();
  loadDashboardData();
  initializeCalendarWidget();
  initializeDateNavigation();
  addSectionTransitions();
  checkDashboardAccess();
});

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

  // Get user name from session
  fetch(`${API_BASE}/auth/session.php`, {
    method: 'GET',
    credentials: 'include'
  })
  .then(response => response.json())
  .then(result => {
    if (result.success && result.data?.user_name) {
      greetingElement.textContent = `${greeting}, ${result.data.user_name}!`;

      if (subtitleElement) {
        subtitleElement.textContent = '';
      }
    }
  })
  .catch(err => {
    greetingElement.textContent = greeting;
  });
}

// Initialize calendar widget
function initializeCalendarWidget() {
  const calendar = document.getElementById('calendar-days');
  const monthDisplay = document.getElementById('calendar-month');
  
  if (!calendar) return;

  renderCalendar(new Date());
  
  // Add month/year display if not present
  if (!monthDisplay && calendar.parentElement) {
    const header = calendar.parentElement.querySelector('.calendar-header h4');
    if (header) {
      header.textContent = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
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
    
    return `
      <div class="calendar-day ${dayClass}" data-date="${day.toISOString().split('T')[0]}">
        ${day.getDate()}
      </div>
    `;
  }).join('');
}

// Initialize date navigation buttons
function initializeDateNavigation() {
  const prevBtn = document.querySelector('.calendar-nav-btn:first-child');
  const nextBtn = document.querySelector('.calendar-nav-btn:last-child');
  let currentMonth = new Date();

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
      renderCalendar(currentMonth);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
      renderCalendar(currentMonth);
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
  clearDashboardDataDisplay();
}

function clearDashboardDataDisplay() {
  document.querySelectorAll('.stat-value').forEach((card) => {
    card.textContent = '';
  });

  document.querySelectorAll('.patients-table tbody').forEach((tbody) => {
    tbody.innerHTML = '';
  });

  const branchesTable = document.querySelector('section:nth-of-type(4) .patients-table');
  if (branchesTable && !branchesTable.querySelector('tbody')) {
    branchesTable.innerHTML = '';
  }
}

// Check if user has access to current dashboard
function checkDashboardAccess() {
  const currentPage = window.location.pathname;
  const isDoctorDashboard = currentPage.includes('doctor-dashboard');
  const isAdminDashboard = currentPage.includes('admin-dashboard');
  
  // Fetch session to check role
  fetch(`${API_BASE}/auth/session.php`, {
    method: 'GET',
    credentials: 'include'
  })
  .then(response => response.json())
  .then(result => {
    if (!result.success) {
      // No session, redirect to login
      window.location.href = 'login.html';
      return;
    }
    
    const role = result.data.user_role;
    
    // Check doctor dashboard access
    if (isDoctorDashboard && role !== 'doctor') {
      window.location.href = 'login.html';
      return;
    }
    
    // Check admin dashboard access
    if (isAdminDashboard && role !== 'admin') {
      window.location.href = 'login.html';
      return;
    }
  })
  .catch(error => {
    console.error('Session check error:', error);
    window.location.href = 'login.html';
  });
}

function loadAdminDashboardData() {
  fetch(`${API_BASE}/admin/dashboard.php`, {
    method: 'GET',
    credentials: 'include'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to load stats');
    }
    return response.json();
  })
  .then(result => {
    if (!result.success) {
      throw new Error(result.message || 'Failed to load admin dashboard data');
    }

    const data = result.data;
    const stats = data.stats || {};

    const statCards = document.querySelectorAll('.stat-value');
    if (statCards[0]) statCards[0].textContent = stats.total_doctors ?? 0;
    if (statCards[1]) statCards[1].textContent = stats.total_patients ?? 0;
    if (statCards[2]) statCards[2].textContent = stats.todays_appointments ?? 0;
    if (statCards[3]) statCards[3].textContent = stats.total_branches ?? 0;

    renderAdminRecentActivity(data.recent_activity || []);
    renderAdminDoctors(data.doctors || []);
    renderAdminPatients(data.patients || []);
    renderAdminBranches(data.branches || []);
    renderAdminAppointments(data.appointments || []);

    animateStatCards();
  })
  .catch(error => {
    console.error('Error loading admin dashboard data:', error);
  });
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

    renderDoctorRecentPatients(data.patients?.slice(0, 5) || []);
    renderDoctorAppointments(data.appointments || []);

    animateStatCards();
  })
  .catch(error => {
    console.error('Error loading doctor dashboard data:', error);
  });
}

function renderAdminRecentActivity(items) {
  const tbody = document.querySelector('#overview .patients-table tbody');
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No recent activity</td></tr>';
    return;
  }

  tbody.innerHTML = items.slice(0, 5).map((item) => `
    <tr>
      <td>
        <div class="patient-cell">
          <div class="patient-avatar">${item.initials || 'N'}</div>
          <div class="patient-info">
            <div class="patient-name">${item.user_name || 'Unknown'}</div>
            <div class="patient-age">${item.action || 'Activity'}</div>
          </div>
        </div>
      </td>
      <td>${formatTime(item.time)}</td>
      <td><span class="badge badge-confirmed">${item.type || 'Update'}</span></td>
    </tr>
  `).join('');
}

function renderAdminDoctors(doctors) {
  const tbody = document.querySelector('section:nth-of-type(2) .patients-table tbody');
  if (!tbody) return;

  if (!doctors.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No doctors found</td></tr>';
    return;
  }

  tbody.innerHTML = doctors.slice(0, 5).map((doctor) => `
    <tr>
      <td>
        <div class="patient-cell">
          <div class="patient-avatar">${(doctor.full_name || 'D').charAt(0).toUpperCase()}</div>
          <div class="patient-info">
            <div class="patient-name">${doctor.full_name || 'N/A'}</div>
            <div class="patient-age">${doctor.specialty || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td>${doctor.branch || 'N/A'}</td>
      <td><span class="badge badge-confirmed">${doctor.is_active ? 'Active' : 'Inactive'}</span></td>
    </tr>
  `).join('');
}

function renderAdminPatients(patients) {
  const tbody = document.querySelector('section:nth-of-type(3) .patients-table tbody');
  if (!tbody) return;

  if (!patients.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No patients found</td></tr>';
    return;
  }

  tbody.innerHTML = patients.slice(0, 5).map((patient) => `
    <tr>
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
      <td>${formatDate(patient.registered_at) || 'N/A'}</td>
      <td><button class="btn-small btn-delete">Delete</button></td>
    </tr>
  `).join('');

  initializeDeleteButtons();
}

function renderAdminBranches(branches) {
  const grid = document.querySelector('section:nth-of-type(4) .patients-table');
  if (!grid) return;

  if (!branches.length) {
    grid.innerHTML = '<div style="text-align:center; color:#6B7280;">No branches found</div>';
    return;
  }

  const tbody = grid.querySelector('tbody');
  if (!tbody) return;

  tbody.innerHTML = branches.slice(0, 5).map((branch) => `
    <tr>
      <td>
        <div class="patient-cell">
          <div class="patient-avatar">📍</div>
          <div class="patient-info">
            <div class="patient-name">${branch.name || 'N/A'}</div>
            <div class="patient-age">${branch.city || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td>${branch.doctor_count || 0}</td>
      <td><span class="badge badge-completed">${branch.appointment_count || 0} appts</span></td>
    </tr>
  `).join('');
}

function renderAdminAppointments(appointments) {
  const tbody = document.querySelector('section:nth-of-type(5) .patients-table tbody');
  if (!tbody) return;

  if (!appointments.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No appointments found</td></tr>';
    return;
  }

  tbody.innerHTML = appointments.slice(0, 5).map((appointment) => `
    <tr>
      <td>
        <div class="patient-cell">
          <div class="patient-avatar">${(appointment.patient_name || 'P').charAt(0).toUpperCase()}</div>
          <div class="patient-info">
            <div class="patient-name">${appointment.patient_name || 'N/A'}</div>
            <div class="patient-age">${appointment.doctor_name || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td>${formatDate(appointment.date) || 'N/A'}</td>
      <td><span class="badge ${statusBadgeClass(appointment.status)}">${capitalize(appointment.status)}</span></td>
    </tr>
  `).join('');
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

  // Logout link handler (allow real logout page flow)
  const logoutLink = document.querySelector('.nav-item.logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', () => {
      logoutLink.classList.add('btn-loading');
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
    button.addEventListener('click', async () => {
      const reportCard = button.closest('.report-card');
      const reportTitle = reportCard.querySelector('h3').textContent;
      const reportType = getReportType(reportTitle);

      if (!reportType) {
        console.error('Unknown report type for title:', reportTitle);
        return;
      }

      // Add loading state
      const originalText = button.textContent;
      button.classList.add('btn-loading');
      button.disabled = true;

      try {
        const response = await fetch(`${API_BASE}/admin/reports.php?type=${encodeURIComponent(reportType)}`, {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch report data');
        }

        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error(result.message || 'Report generation failed');
        }

        const csvContent = convertRowsToCsv(result.data.columns || [], result.data.rows || []);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.fileName || `${reportTitle.replace(/\s/g, '_').toLowerCase()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

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

function getReportType(reportTitle) {
  const title = reportTitle.toLowerCase();
  if (title.includes('monthly appointments')) return 'monthly-appointments';
  if (title.includes('doctor performance')) return 'doctor-performance';
  if (title.includes('revenue')) return 'revenue';
  if (title.includes('patient demographics')) return 'patient-demographics';
  return null;
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

