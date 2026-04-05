// Profile.js - Patient profile page functionality

const API_BASE = window.API_BASE || 'http://localhost/check-me-up/backend/api';
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  const sessionData = await verifyActiveSession();
  if (!sessionData) {
    return;
  }

  const role = sessionData.data && sessionData.data.user_role ? sessionData.data.user_role : null;
  if (role && role !== 'patient') {
    if (role === 'doctor') {
      localStorage.clear();
      window.location.replace('doctor-dashboard.html');
      return;
    }
    if (role === 'admin') {
      localStorage.clear();
      window.location.replace('admin-dashboard.html');
      return;
    }
  }

  loadUserProfile();
  loadAppointments('upcoming');
  initializeTabSwitching();
  initializeCancelAppointment();
  initializeBookAgain();
  initializeProfileEditing();
  animateSidebar();
});

async function verifyActiveSession() {
  try {
    const response = await fetch(`${API_BASE}/auth/session.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const sessionData = await response.json().catch(() => ({ success: false }));
    if (!sessionData.success) {
      localStorage.clear();
      window.location.replace('login.html');
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error('Session check failed:', error);
    localStorage.clear();
    window.location.replace('login.html');
    return null;
  }
}

function loadUserProfile() {
  fetch(`${API_BASE}/patient/profile.php`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (!data.success || !data.data) {
        console.error('Failed to load profile:', data.message || 'Unknown error');
        return;
      }

      currentProfile = {
        ...data.data,
        full_name: String(data.data.full_name || '').trim(),
        phone: String(data.data.phone || '').trim(),
        date_of_birth: String(data.data.date_of_birth || '').trim(),
        gender: String(data.data.gender || '').trim(),
        insurance_company: String(data.data.insurance_company || '').trim()
      };
      renderProfile(currentProfile);
    })
    .catch(error => {
      console.error('Error fetching profile:', error);
    });
}

function renderProfile(profile) {
  const profileName = profile.full_name || 'Patient';
  const formattedDob = formatDateForDisplay(profile.date_of_birth);

  const profileNameElement = document.getElementById('profileName');
  if (profileNameElement) {
    profileNameElement.textContent = profileName;
  }

  const avatarElement = document.getElementById('profileAvatar');
  if (avatarElement) {
    avatarElement.textContent = getInitials(profileName);
  }

  setTextById('sidebarEmail', profile.email || 'N/A');
  setTextById('sidebarPhone', profile.phone || 'N/A');
  setTextById('sidebarGender', profile.gender || 'N/A');
  setTextById('sidebarDob', formattedDob);
  setTextById('sidebarInsurance', profile.insurance_company || 'No Insurance');

  setTextById('roFullName', profileName);
  setTextById('roEmail', profile.email || 'N/A');
  setTextById('roPhone', profile.phone || 'N/A');
  setTextById('roDob', formattedDob);
  setTextById('roGender', profile.gender || 'N/A');
  setTextById('roInsurance', profile.insurance_company || 'No Insurance');
}

function setTextById(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function formatDateForDisplay(dateValue) {
  if (!dateValue) {
    return 'N/A';
  }

  const dateObj = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(dateObj.getTime())) {
    return dateValue;
  }

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getInitials(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'PA';
  }
  return parts.slice(0, 2).map(part => part[0].toUpperCase()).join('');
}

function initializeProfileEditing() {
  const editButton = document.getElementById('editProfileBtn');
  const cancelButton = document.getElementById('cancelEditProfile');
  const editForm = document.getElementById('profileEditForm');
  const readView = document.getElementById('profileReadOnlyView');

  if (!editButton || !cancelButton || !editForm || !readView) {
    return;
  }

  const phoneInput = document.getElementById('editPhone');
  if (phoneInput && phoneInput.dataset.phoneSanitized !== '1') {
    phoneInput.dataset.phoneSanitized = '1';
    phoneInput.addEventListener('input', () => {
      const sanitizedValue = String(phoneInput.value || '').replace(/[^0-9+\s\-()+]/g, '');
      if (sanitizedValue !== phoneInput.value) {
        phoneInput.value = sanitizedValue;
      }
    });
  }

  editButton.addEventListener('click', () => {
    if (!currentProfile) {
      return;
    }
    clearProfileMessage();
    fillEditForm(currentProfile);
    readView.style.display = 'none';
    editForm.style.display = 'block';
    editButton.style.display = 'none';
  });

  cancelButton.addEventListener('click', () => {
    clearProfileMessage();
    editForm.reset();
    editForm.style.display = 'none';
    readView.style.display = 'grid';
    editButton.style.display = 'inline-flex';
  });

  editForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearProfileMessage();

    const payload = {
      full_name: String(document.getElementById('editFullName')?.value || '').trim(),
      phone: String(document.getElementById('editPhone')?.value || '').trim(),
      date_of_birth: String(document.getElementById('editDob')?.value || '').trim(),
      gender: String(document.getElementById('editGender')?.value || '').trim(),
      insurance_company: String(document.getElementById('editInsurance')?.value || '').trim()
    };

    if (!payload.full_name || !payload.phone || !payload.date_of_birth || !payload.gender || !payload.insurance_company) {
      showProfileMessage('Please fill in all fields.', 'error');
      return;
    }

    if (!/^[0-9+\s\-()+]{7,20}$/.test(payload.phone)) {
      showProfileMessage('Phone number contains invalid characters.', 'error');
      return;
    }

    const submitButton = editForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Saving...';
    }

    try {
      const response = await fetch(`${API_BASE}/patient/update-profile.php`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({ success: false, message: 'Unexpected server response' }));
      if (!response.ok || !result.success) {
        showProfileMessage(result.message || 'Failed to update profile.', 'error');
        return;
      }

      currentProfile = {
        ...currentProfile,
        ...payload
      };

      renderProfile(currentProfile);
      updateLocalUserName(payload.full_name);
      showProfileMessage('Profile updated successfully', 'success');

      editForm.style.display = 'none';
      readView.style.display = 'grid';
      editButton.style.display = 'inline-flex';
    } catch (error) {
      console.error('Profile update failed:', error);
      showProfileMessage('Could not connect to server. Please try again.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}

function fillEditForm(profile) {
  const setValue = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.value = value || '';
    }
  };

  setValue('editFullName', profile.full_name);
  setValue('editPhone', profile.phone);
  setValue('editDob', profile.date_of_birth);
  setValue('editGender', profile.gender);
  setValue('editInsurance', profile.insurance_company);
}

function showProfileMessage(message, type) {
  const messageElement = document.getElementById('profileUpdateMessage');
  if (!messageElement) {
    return;
  }
  messageElement.className = `profile-update-message ${type}`;
  messageElement.textContent = message;
}

function clearProfileMessage() {
  const messageElement = document.getElementById('profileUpdateMessage');
  if (!messageElement) {
    return;
  }
  messageElement.className = 'profile-update-message';
  messageElement.textContent = '';
}

function updateLocalUserName(fullName) {
  let existingUser = {};
  try {
    existingUser = JSON.parse(localStorage.getItem('checkmeup_user') || '{}');
  } catch {
    existingUser = {};
  }

  const updatedUser = {
    ...existingUser,
    name: fullName,
    user_name: fullName
  };
  localStorage.setItem('checkmeup_user', JSON.stringify(updatedUser));

  const greeting = document.querySelector('.navbar .nav-links span');
  if (greeting && greeting.textContent.trim().startsWith('Hi,')) {
    const firstName = fullName.split(' ')[0];
    greeting.textContent = `Hi, ${firstName}`;
  }
}

function loadAppointments(type) {
  const tableId = type === 'upcoming' ? 'upcomingAppointments' : 'pastAppointments';
  const tableBody = document.getElementById(tableId);
  const tabContent = document.getElementById(type);

  if (!tableBody || !tabContent) {
    return;
  }

  const emptyCols = 7;
  tableBody.innerHTML = `<tr><td colspan="${emptyCols}" style="text-align: center; padding: 2rem; color: #6B7280;">Loading appointments...</td></tr>`;

  fetch(`${API_BASE}/patient/appointments.php?type=${type}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
    .then(response => response.json())
    .then(data => {
      if (!data.success || !Array.isArray(data.data)) {
        tableBody.innerHTML = `<tr><td colspan="${emptyCols}" style="text-align: center; padding: 2rem; color: #EF4444;">Could not load data. Please try again.</td></tr>`;
        return;
      }

      const appointments = data.data;
      tableBody.innerHTML = '';

      if (appointments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${emptyCols}" style="text-align: center; padding: 2rem; color: #6B7280;">No ${type} appointments found</td></tr>`;
        const countElement = tabContent.querySelector('.appointments-count');
        if (countElement) {
          countElement.textContent = `You have no ${type} appointments`;
        }
        return;
      }

      appointments.forEach(appointment => {
        const row = document.createElement('tr');

        if (type === 'upcoming') {
          const normalizedStatus = String(appointment.status || 'pending').toLowerCase();
          const canCancel = normalizedStatus === 'pending' || normalizedStatus === 'confirmed';
          const statusClass = normalizedStatus === 'confirmed'
            ? 'status-confirmed'
            : normalizedStatus === 'cancelled'
              ? 'status-cancelled'
              : normalizedStatus === 'completed'
                ? 'status-completed'
                : 'status-pending';
          const statusTitle = normalizedStatus === 'confirmed'
            ? 'Your appointment is confirmed'
            : normalizedStatus === 'pending'
              ? 'Waiting for doctor confirmation'
              : normalizedStatus === 'cancelled'
                ? 'This appointment was cancelled'
                : 'This appointment is completed';

          row.innerHTML = `
            <td>${appointment.doctor_name || 'N/A'}</td>
            <td>${appointment.specialty || 'N/A'}</td>
            <td>${appointment.branch || 'N/A'}</td>
            <td>${appointment.date || 'N/A'}</td>
            <td>${appointment.time || 'N/A'}</td>
            <td><span class="status-badge ${statusClass}" title="${statusTitle}">${capitalizeStatus(normalizedStatus)}</span></td>
            <td>${canCancel ? `<button class="btn-cancel" data-id="${appointment.id}">Cancel</button>` : ''}</td>
          `;
        } else {
          row.innerHTML = `
            <td>${appointment.doctor_name || 'N/A'}</td>
            <td>${appointment.specialty || 'N/A'}</td>
            <td>${appointment.branch || 'N/A'}</td>
            <td>${appointment.date || 'N/A'}</td>
            <td>${appointment.time || 'N/A'}</td>
            <td><span class="status-badge status-completed">${appointment.status || 'completed'}</span></td>
            <td><button class="btn-book-again">Book Again</button></td>
          `;
        }

        tableBody.appendChild(row);
      });

      const countElement = tabContent.querySelector('.appointments-count');
      if (countElement) {
        if (appointments.length === 1) {
          countElement.textContent = `You have 1 ${type === 'upcoming' ? 'upcoming appointment' : 'completed appointment'}`;
        } else {
          countElement.textContent = `You have ${appointments.length} ${type === 'upcoming' ? 'upcoming appointments' : 'completed appointments'}`;
        }
      }
    })
    .catch(error => {
      console.error('Error fetching appointments:', error);
      tableBody.innerHTML = `<tr><td colspan="${emptyCols}" style="text-align: center; padding: 2rem; color: #EF4444;">Could not load data. Please try again.</td></tr>`;
    });
}

function capitalizeStatus(status) {
  const value = String(status || '').trim();
  if (!value) {
    return 'Pending';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function initializeTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      button.classList.add('active');
      const targetContent = document.getElementById(targetTab);
      if (targetContent) {
        targetContent.classList.add('active');
      }

      if (targetTab === 'past') {
        loadAppointments('past');
      }
    });
  });
}

function initializeCancelAppointment() {
  const upcomingTable = document.getElementById('upcomingAppointments');
  const cancelMessage = document.getElementById('cancelMessage');

  if (!upcomingTable) {
    return;
  }

  upcomingTable.addEventListener('click', event => {
    const button = event.target.closest('.btn-cancel');
    if (!button) {
      return;
    }

    const appointmentId = button.getAttribute('data-id');
    const row = button.closest('tr');
    const doctorName = row && row.cells[0] ? row.cells[0].textContent : 'doctor';

    button.disabled = true;
    button.textContent = 'Cancelling...';

    fetch(`${API_BASE}/patient/appointments.php`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ id: parseInt(appointmentId, 10) })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success && row) {
          row.remove();
          if (cancelMessage) {
            cancelMessage.textContent = `Appointment with ${doctorName} cancelled successfully`;
            cancelMessage.style.color = '#34D399';
            setTimeout(() => {
              cancelMessage.textContent = '';
            }, 4000);
          }
          updateAppointmentsCount();
          return;
        }

        if (cancelMessage) {
          cancelMessage.textContent = data.message || 'Failed to cancel appointment';
          cancelMessage.style.color = '#EF4444';
          setTimeout(() => {
            cancelMessage.textContent = '';
          }, 4000);
        }

        button.disabled = false;
        button.textContent = 'Cancel';
      })
      .catch(error => {
        console.error('Error cancelling appointment:', error);
        if (cancelMessage) {
          cancelMessage.textContent = 'Failed to cancel appointment. Please try again.';
          cancelMessage.style.color = '#EF4444';
          setTimeout(() => {
            cancelMessage.textContent = '';
          }, 4000);
        }

        button.disabled = false;
        button.textContent = 'Cancel';
      });
  });
}

function updateAppointmentsCount() {
  const upcomingTable = document.getElementById('upcomingAppointments');
  const countElement = document.querySelector('#upcoming .appointments-count');

  if (!upcomingTable || !countElement) {
    return;
  }

  const appointmentRows = Array.from(upcomingTable.querySelectorAll('tr')).filter(row => {
    const cells = row.querySelectorAll('td');
    return cells.length > 1;
  });

  const remainingCount = appointmentRows.length;
  if (remainingCount === 0) {
    countElement.textContent = 'You have no upcoming appointments';
  } else if (remainingCount === 1) {
    countElement.textContent = 'You have 1 upcoming appointment';
  } else {
    countElement.textContent = `You have ${remainingCount} upcoming appointments`;
  }
}

function initializeBookAgain() {
  const pastTable = document.querySelector('#past .appointments-table tbody');
  if (!pastTable) {
    return;
  }

  pastTable.addEventListener('click', event => {
    const button = event.target.closest('.btn-book-again');
    if (!button) {
      return;
    }

    window.location.replace('booking.html');
  });
}

function animateSidebar() {
  const sidebar = document.querySelector('.profile-sidebar');
  if (sidebar) {
    sidebar.style.animationDelay = '0.2s';
  }
}
