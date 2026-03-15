// Dashboard.js - Enhanced with smooth animations and interactions

const API_BASE = 'http://localhost/check-me-up/backend/api';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeDashboardMobileMenu();
  initializeSidebarNavigation();
  initializeDoctorSchedule();
  initializeReportDownloads();
  addSectionTransitions();
  checkDashboardAccess();
});

function initializeDashboardMobileMenu() {
  const container = document.querySelector('.dashboard-container');
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');

  if (!container || !sidebar || !mainContent || document.querySelector('.dashboard-topbar')) {
    return;
  }

  const titleElement = document.querySelector('.doctor-name, .admin-title');
  const topbar = document.createElement('div');
  topbar.className = 'dashboard-topbar';
  topbar.innerHTML = `
    <div class="dashboard-topbar-title">${titleElement ? titleElement.textContent.trim() : 'Dashboard'}</div>
    <button type="button" class="dashboard-menu-toggle" aria-label="Toggle dashboard menu" aria-expanded="false">☰</button>
  `;

  container.insertBefore(topbar, mainContent);

  const overlay = document.createElement('button');
  overlay.type = 'button';
  overlay.className = 'dashboard-overlay';
  overlay.setAttribute('aria-label', 'Close dashboard menu');
  document.body.appendChild(overlay);

  const toggleButton = topbar.querySelector('.dashboard-menu-toggle');

  const closeMenu = () => {
    document.body.classList.remove('dashboard-sidebar-open');
    toggleButton.setAttribute('aria-expanded', 'false');
  };

  toggleButton.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('dashboard-sidebar-open');
    toggleButton.setAttribute('aria-expanded', String(isOpen));
  });

  overlay.addEventListener('click', closeMenu);

  sidebar.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeMenu();
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMenu();
    }
  });
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

    
    const role = result.data.user_role;
    
    
    
    // Load dashboard data for authorized role
    if (isAdminDashboard && role === 'admin') {
      loadAdminDashboardData();
      return;
    }

    if (isDoctorDashboard && role === 'doctor') {
      loadDoctorDashboardData();
      return;
    }
  })
  .catch(error => {
    console.error('Session check error:', error);
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

    const statCards = document.querySelectorAll('.stat-card .stat-number');
    if (statCards[0]) statCards[0].textContent = stats.total_doctors ?? 0;
    if (statCards[1]) statCards[1].textContent = stats.total_patients ?? 0;
    if (statCards[2]) statCards[2].textContent = stats.todays_appointments ?? 0;
    if (statCards[3]) statCards[3].textContent = stats.total_branches ?? 0;

    renderAdminActivity(data.recent_activity || []);
    renderAdminDoctors(data.doctors || []);
    renderAdminPatients(data.patients || []);
    renderAdminBranches(data.branches || []);
    renderAdminAppointments(data.appointments || []);

    animateStatCards();
    initializeAdminControls();
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

    const doctorName = document.querySelector('.doctor-name');
    const doctorSpecialty = document.querySelector('.doctor-specialty');
    if (doctorName && data.profile?.full_name) {
      doctorName.textContent = data.profile.full_name;
    }
    if (doctorSpecialty && data.profile?.specialty) {
      doctorSpecialty.textContent = data.profile.specialty;
    }

    const todayStat = document.getElementById('doctor-stat-today');
    const patientsStat = document.getElementById('doctor-stat-patients');
    const pendingStat = document.getElementById('doctor-stat-pending');

    if (todayStat) todayStat.textContent = data.stats?.todays_appointments ?? 0;
    if (patientsStat) patientsStat.textContent = data.stats?.total_patients ?? 0;
    if (pendingStat) pendingStat.textContent = data.stats?.pending_confirmations ?? 0;

    renderDoctorAppointments(data.appointments || []);
    renderDoctorPatients(data.patients || []);

    animateStatCards();
  })
  .catch(error => {
    console.error('Error loading doctor dashboard data:', error);
  });
}

function renderAdminActivity(items) {
  const container = document.getElementById('admin-activity-list');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<div class="activity-item"><span class="activity-text">No recent activity found.</span></div>';
    return;
  }

  container.innerHTML = items.map((item) => {
    const when = formatRelativeTime(item.time);
    return `
      <div class="activity-item">
        <span class="activity-time">${when}</span>
        <span class="activity-text">${item.text}</span>
      </div>
    `;
  }).join('');
}

function renderAdminDoctors(doctors) {
  const tbody = document.getElementById('admin-doctors-body');
  if (!tbody) return;

  if (!doctors.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No doctors found</td></tr>';
    return;
  }

  tbody.innerHTML = doctors.map((doctor) => {
    const statusClass = doctor.is_active ? 'badge-active' : 'badge-inactive';
    const statusText = doctor.is_active ? 'Active' : 'Inactive';
    const actionText = doctor.is_active ? 'Deactivate' : 'Activate';

    return `
      <tr>
        <td>${doctor.full_name}</td>
        <td>${doctor.specialty}</td>
        <td>${doctor.branch}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>
          <button class="action-btn btn-edit">Edit</button>
          <button class="action-btn btn-deactivate">${actionText}</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAdminPatients(patients) {
  const tbody = document.getElementById('admin-patients-body');
  if (!tbody) return;

  if (!patients.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No patients found</td></tr>';
    return;
  }

  tbody.innerHTML = patients.map((patient) => `
    <tr>
      <td>${patient.full_name || 'N/A'}</td>
      <td>${patient.email || 'N/A'}</td>
      <td>${patient.phone || 'N/A'}</td>
      <td>${formatDate(patient.registered_at)}</td>
      <td>
        <button class="action-btn btn-edit">View</button>
        <button class="action-btn btn-delete">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderAdminBranches(branches) {
  const grid = document.getElementById('admin-branches-grid');
  if (!grid) return;

  if (!branches.length) {
    grid.innerHTML = '<div class="card" style="text-align:center; color:#6B7280;">No branches found</div>';
    return;
  }

  grid.innerHTML = branches.map((branch) => `
    <div class="card branch-card">
      <h4 class="branch-name">${branch.name}</h4>
      <p class="branch-address">${branch.address}<br>${branch.city}</p>
      <div class="branch-stats">
        <div class="branch-stat">
          <span class="stat-value">${branch.doctor_count}</span>
          <span class="stat-text">Doctors</span>
        </div>
        <div class="branch-stat">
          <span class="stat-value">${branch.appointment_count}</span>
          <span class="stat-text">Appointments</span>
        </div>
      </div>
      <button class="btn-secondary edit-branch-btn">Edit Branch</button>
    </div>
  `).join('');
}

function renderAdminAppointments(appointments) {
  const tbody = document.getElementById('admin-appointments-body');
  if (!tbody) return;

  if (!appointments.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1rem; color:#6B7280;">No appointments found</td></tr>';
    return;
  }

  tbody.innerHTML = appointments.map((appointment) => `
    <tr>
      <td>${appointment.patient_name}</td>
      <td>${appointment.doctor_name}</td>
      <td>${appointment.branch}</td>
      <td>${formatDate(appointment.date)}</td>
      <td>${formatTime(appointment.time)}</td>
      <td><span class="badge ${statusBadgeClass(appointment.status)}">${capitalize(appointment.status)}</span></td>
    </tr>
  `).join('');
}

function renderDoctorAppointments(appointments) {
  const tbody = document.getElementById('doctor-appointments-body');
  if (!tbody) return;

  if (!appointments.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem; color:#6B7280;">No appointments found</td></tr>';
    return;
  }

  tbody.innerHTML = appointments.map((appointment) => `
    <tr>
      <td>${appointment.patient_name}</td>
      <td>${formatDate(appointment.date)}</td>
      <td>${formatTime(appointment.time)}</td>
      <td>${appointment.specialty}</td>
      <td><span class="badge ${statusBadgeClass(appointment.status)}">${capitalize(appointment.status)}</span></td>
    </tr>
  `).join('');
}

function renderDoctorPatients(patients) {
  const grid = document.getElementById('doctor-patients-grid');
  if (!grid) return;

  if (!patients.length) {
    grid.innerHTML = '<div class="card" style="text-align:center; color:#6B7280;">No patients found</div>';
    return;
  }

  grid.innerHTML = patients.map((patient, index) => `
    <div class="card patient-card">
      <div class="patient-avatar">${index % 2 === 0 ? '👨' : '👩'}</div>
      <h4 class="patient-name">${patient.full_name}</h4>
      <p class="patient-info">Age: ${patient.age ?? 'N/A'}</p>
      <p class="patient-info">Last Visit: ${formatDate(patient.last_visit)}</p>
      <button class="btn-secondary view-profile-btn">View Profile</button>
    </div>
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
  const date = new Date(`1970-01-01T${value}`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
  if (status === 'completed') return 'badge-confirmed';
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
  const statNumbers = document.querySelectorAll('.stat-number');
  
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
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link:not(.logout)');
  const sections = document.querySelectorAll('.content-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Get the section to show
      const sectionId = link.dataset.section;

      // Update active state on nav links
      navLinks.forEach(l => l.classList.remove('active'));
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
    });
  });

  // Logout link handler (allow real logout page flow)
  const logoutLink = document.querySelector('.nav-link.logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', () => {
      logoutLink.classList.add('btn-loading');
    });
  }
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

