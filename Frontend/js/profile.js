// Profile.js - Patient profile page functionality

const API_BASE = window.API_BASE || 'http://localhost/check-me-up/backend/api';

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

  tableBody.innerHTML = '';

  const countElement = tabContent.querySelector('.appointments-count');
  if (countElement) {
    countElement.textContent = `You have no ${type} appointments`;
  }
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
  if (!upcomingTable) {
    return;
  }

  upcomingTable.addEventListener('click', () => {
    // Intentionally disabled.
  });
}

function initializeBookAgain() {
  const pastTable = document.querySelector('#past .appointments-table tbody');
  if (!pastTable) {
    return;
  }

  pastTable.addEventListener('click', () => {
    // Intentionally disabled.
  });
}

function animateSidebar() {
  const sidebar = document.querySelector('.profile-sidebar');
  if (sidebar) {
    sidebar.style.animationDelay = '0.2s';
  }
}
