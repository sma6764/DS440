// Profile.js - Patient profile page functionality

const API_BASE = 'http://localhost/check-me-up/backend/api';

document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
  loadAppointments('upcoming');
  initializeTabSwitching();
  initializeCancelAppointment();
  initializeBookAgain();
  animateSidebar();
});

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

      const profile = data.data;
      const profileName = profile.full_name && profile.full_name.trim() ? profile.full_name : 'Patient';

      const nameElement = document.querySelector('.profile-name');
      if (nameElement) {
        nameElement.textContent = profileName;
      }

      const infoValues = document.querySelectorAll('.profile-info .info-value');
      if (infoValues.length >= 4) {
        infoValues[0].textContent = profile.email || 'N/A';
        infoValues[1].textContent = profile.phone || 'N/A';
        infoValues[2].textContent = profile.gender || 'N/A';
        infoValues[3].textContent = profile.date_of_birth || 'N/A';
      }

      const insuranceBadge = document.querySelector('.insurance-badge');
      if (insuranceBadge) {
        insuranceBadge.textContent = profile.insurance_company || 'No Insurance';
      }

      const infoGridValues = document.querySelectorAll('.info-grid .info-grid-value');
      if (infoGridValues.length >= 6) {
        infoGridValues[0].textContent = profileName;
        infoGridValues[1].textContent = profile.email || 'N/A';
        infoGridValues[2].textContent = profile.phone || 'N/A';
        infoGridValues[3].textContent = profile.date_of_birth || 'N/A';
        infoGridValues[4].textContent = profile.gender || 'N/A';
        infoGridValues[5].textContent = profile.insurance_company || 'No Insurance';
      }
    })
    .catch(error => {
      console.error('Error fetching profile:', error);
    });
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
          row.innerHTML = `
            <td>${appointment.doctor_name || 'N/A'}</td>
            <td>${appointment.specialty || 'N/A'}</td>
            <td>${appointment.branch || 'N/A'}</td>
            <td>${appointment.date || 'N/A'}</td>
            <td>${appointment.time || 'N/A'}</td>
            <td><span class="status-badge status-confirmed">${appointment.status || 'pending'}</span></td>
            <td><button class="btn-cancel" data-id="${appointment.id}">Cancel</button></td>
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

    window.location.href = 'booking.html';
  });
}

function animateSidebar() {
  const sidebar = document.querySelector('.profile-sidebar');
  if (sidebar) {
    sidebar.style.animationDelay = '0.2s';
  }
}
