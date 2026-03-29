// Admin Patient View Script

const API_BASE = window.API_BASE || 'http://localhost/check-me-up/backend/api';

// Get patient ID from URL
function getPatientIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('patient_id');
}

// Check admin session and redirect if needed
function checkAdminSession() {
  const role = localStorage.getItem('user_role');
  if (role !== 'admin') {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is admin
  if (!checkAdminSession()) {
    return;
  }

  // Get patient ID from URL
  const patientId = getPatientIdFromURL();
  if (!patientId) {
    window.location.href = 'admin-dashboard.html';
    return;
  }

  // Load patient data
  loadPatientData(patientId);
});

// Load patient profile and appointments
async function loadPatientData(patientId) {
  try {
    const [profileResponse, appointmentsResponse] = await Promise.all([
      fetch(`${API_BASE}/patient/profile.php?patient_id=${patientId}`, {
        method: 'GET',
        credentials: 'include'
      }),
      fetch(`${API_BASE}/patient/appointments.php?patient_id=${patientId}&type=all`, {
        method: 'GET',
        credentials: 'include'
      })
    ]);

    // Check if responses are OK
    if (!profileResponse.ok || !appointmentsResponse.ok) {
      showError();
      return;
    }

    const profileData = await profileResponse.json();
    const appointmentsData = await appointmentsResponse.json();

    // Check if data is successful
    if (!profileData.success || !appointmentsData.success) {
      showError();
      return;
    }

    // Get patient and appointments data
    const patient = profileData.data;
    const appointments = appointmentsData.data || [];

    // Hide skeleton loaders
    hideSkeletons();

    // Populate hero section
    populatePatientHero(patient);

    // Populate appointment table
    populateAppointments(appointments);

    // Populate patient information
    populatePatientInfo(patient);

    // Populate activity summary
    populateActivitySummary(patient, appointments);

  } catch (error) {
    console.error('Error loading patient data:', error);
    showError();
  }
}

function hideSkeletons() {
  // Hide all skeleton loaders
  const heroSkeleton = document.getElementById('patient-hero-skeleton');
  const patientHero = document.getElementById('patient-hero');

  if (heroSkeleton) heroSkeleton.style.display = 'none';
  if (patientHero) patientHero.style.display = 'block';

  const appointmentSkeleton = document.getElementById('appointment-history-skeleton');
  const appointmentTable = document.getElementById('appointment-table');
  if (appointmentSkeleton) appointmentSkeleton.style.display = 'none';
  if (appointmentTable) appointmentTable.style.display = 'table';

  const infoSkeleton = document.getElementById('patient-info-skeleton');
  const infoGrid = document.getElementById('patient-info-grid');
  if (infoSkeleton) infoSkeleton.style.display = 'none';
  if (infoGrid) infoGrid.style.display = 'grid';

  const activitySkeleton = document.getElementById('activity-summary-skeleton');
  const activityGrid = document.getElementById('activity-grid');
  if (activitySkeleton) activitySkeleton.style.display = 'none';
  if (activityGrid) activityGrid.style.display = 'grid';
}

function populatePatientHero(patient) {
  // Get initials
  const names = patient.full_name.split(' ');
  const initials = names.map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2);

  // Populate hero section
  const avatar = document.getElementById('patient-initials');
  if (avatar) avatar.textContent = initials;

  const name = document.getElementById('patient-name');
  if (name) name.textContent = patient.full_name;

  const email = document.getElementById('patient-email');
  if (email) email.textContent = patient.email || 'N/A';

  const phone = document.getElementById('patient-phone');
  if (phone) phone.textContent = patient.phone || 'N/A';

  const gender = document.getElementById('patient-gender');
  if (gender) gender.textContent = (patient.gender || 'N/A').charAt(0).toUpperCase() + (patient.gender || '').slice(1);

  const dob = document.getElementById('patient-dob');
  if (dob) dob.textContent = formatDate(patient.date_of_birth);

  const createdDate = document.getElementById('patient-created');
  if (createdDate) createdDate.textContent = formatDate(patient.created_at);

  // Insurance badge
  const insuranceBadge = document.getElementById('patient-insurance-badge');
  const insuranceText = document.getElementById('insurance-text');
  if (insuranceBadge && insuranceText) {
    if (patient.insurance_company) {
      insuranceText.textContent = patient.insurance_company;
      insuranceBadge.classList.add('covered');
    } else {
      insuranceText.textContent = 'No Insurance';
      insuranceBadge.classList.add('no-insurance');
    }
  }
}

function populateAppointments(appointments) {
  const tbody = document.getElementById('appointment-tbody');
  if (!tbody) return;

  // Sort by date descending (most recent first)
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(a.date + ' ' + a.time);
    const dateB = new Date(b.date + ' ' + b.time);
    return dateB - dateA;
  });

  // Count appointments by status
  const upcoming = sortedAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length;
  const completed = sortedAppointments.filter(a => a.status === 'completed').length;

  // Update quick stats
  const totalCount = document.getElementById('total-appointments-count');
  const upcomingCount = document.getElementById('upcoming-appointments-count');
  const completedCount = document.getElementById('completed-appointments-count');

  if (totalCount) totalCount.textContent = appointments.length;
  if (upcomingCount) upcomingCount.textContent = upcoming;
  if (completedCount) completedCount.textContent = completed;

  // Populate table
  if (sortedAppointments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--color-text-secondary);">No appointments found</td></tr>';
    return;
  }

  tbody.innerHTML = sortedAppointments.map(appointment => {
    const statusClass = `status-${appointment.status}`;
    return `
      <tr>
        <td>${appointment.doctor_name}</td>
        <td>${appointment.specialty}</td>
        <td>${appointment.branch}</td>
        <td>${formatDate(appointment.date)}</td>
        <td>${appointment.time}</td>
        <td><span class="status-badge ${statusClass}">${appointment.status}</span></td>
      </tr>
    `;
  }).join('');
}

function populatePatientInfo(patient) {
  const fields = {
    'info-full-name': patient.full_name,
    'info-email': patient.email || 'N/A',
    'info-phone': patient.phone || 'N/A',
    'info-gender': patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'N/A',
    'info-dob': formatDate(patient.date_of_birth),
    'info-insurance': patient.insurance_company || 'None',
    'info-created': formatDate(patient.created_at),
    'info-id': patient.id
  };

  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });
}

function populateActivitySummary(patient, appointments) {
  // Account created date
  const createdElement = document.getElementById('activity-created');
  if (createdElement) createdElement.textContent = formatDate(patient.created_at);

  // Total appointments
  const totalElement = document.getElementById('activity-total');
  if (totalElement) totalElement.textContent = appointments.length;

  // Most visited specialist
  const specialtyCount = {};
  appointments.forEach(apt => {
    const specialty = apt.specialty || 'Unknown';
    specialtyCount[specialty] = (specialtyCount[specialty] || 0) + 1;
  });

  const specialist = Object.entries(specialtyCount).length > 0
    ? Object.entries(specialtyCount).reduce((a, b) => a[1] > b[1] ? a : b)[0]
    : 'N/A';

  const specialistElement = document.getElementById('activity-specialist');
  if (specialistElement) specialistElement.textContent = specialist;

  // Most visited branch
  const branchCount = {};
  appointments.forEach(apt => {
    const branch = apt.branch || 'Unknown';
    branchCount[branch] = (branchCount[branch] || 0) + 1;
  });

  const branch = Object.entries(branchCount).length > 0
    ? Object.entries(branchCount).reduce((a, b) => a[1] > b[1] ? a : b)[0]
    : 'N/A';

  const branchElement = document.getElementById('activity-branch');
  if (branchElement) branchElement.textContent = branch;

  // Last appointment date
  let lastAppointment = 'N/A';
  if (appointments.length > 0) {
    // Sort by date descending and get the most recent
    const sorted = [...appointments].sort((a, b) => {
      const dateA = new Date(a.date + ' ' + a.time);
      const dateB = new Date(b.date + ' ' + b.time);
      return dateB - dateA;
    });
    lastAppointment = formatDate(sorted[0].date);
  }

  const lastElement = document.getElementById('activity-last');
  if (lastElement) lastElement.textContent = lastAppointment;
}

function showError() {
  const errorElement = document.getElementById('patient-error');
  const heroElement = document.getElementById('patient-hero');
  const sectionsElement = document.querySelector('.patient-sections');

  if (errorElement) errorElement.style.display = 'block';
  if (heroElement) heroElement.style.display = 'none';
  if (sectionsElement) sectionsElement.style.display = 'none';
}

// Format date helper
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  } catch {
    return dateString;
  }
}
