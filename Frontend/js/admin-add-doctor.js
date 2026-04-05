const API_BASE = window.API_BASE || 'http://localhost/check-me-up/backend/api';

const ADMIN_KEYS = ['user_role', 'checkmeup_role'];
const doctorIdParam = Number(new URLSearchParams(window.location.search).get('doctor_id') || 0);
const isEditMode = Number.isFinite(doctorIdParam) && doctorIdParam > 0;

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAdminSession()) {
    return;
  }

  const form = document.getElementById('addDoctorForm');
  if (!form) return;

  configureFormForMode(form);

  try {
    await Promise.all([loadSpecialists(), loadBranches()]);
    if (isEditMode) {
      await loadDoctorForEdit(form);
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showFormMessage('Could not load form data. Please refresh and try again.', 'error');
  }

  initializeDoctorForm(form);
});

function initializePhoneSanitizer(form) {
  const phoneInput = form.querySelector('#phone');
  if (!phoneInput || phoneInput.dataset.phoneSanitized === '1') {
    return;
  }

  phoneInput.dataset.phoneSanitized = '1';
  phoneInput.addEventListener('input', () => {
    const sanitizedValue = String(phoneInput.value || '').replace(/[^0-9+\s\-()+]/g, '');
    if (sanitizedValue !== phoneInput.value) {
      phoneInput.value = sanitizedValue;
    }
  });
}

function checkAdminSession() {
  const role = ADMIN_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);

  if (role !== 'admin') {
    window.location.href = 'login.html';
    return false;
  }

  return true;
}

function configureFormForMode(form) {
  const pageTitle = document.querySelector('.page-title-wrap .section-title');
  const pageSubtitle = document.querySelector('.page-title-wrap .page-subtitle');
  const submitButton = form.querySelector('button[type="submit"]');
  const passwordInput = form.querySelector('#password');
  const confirmInput = form.querySelector('#confirmPassword');

  if (!isEditMode) return;

  if (pageTitle) pageTitle.textContent = 'Edit Doctor';
  if (pageSubtitle) pageSubtitle.textContent = 'Update doctor profile and account details';
  if (submitButton) submitButton.textContent = 'Update Doctor';

  if (passwordInput) {
    passwordInput.required = false;
    passwordInput.placeholder = 'Leave blank to keep current password';
  }

  if (confirmInput) {
    confirmInput.required = false;
    confirmInput.placeholder = 'Leave blank to keep current password';
  }

  initializePhoneSanitizer(form);
}

function initializeDoctorForm(form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormMessage();

    const formData = new FormData(form);
    const payload = {
      doctor_id: doctorIdParam,
      full_name: String(formData.get('full_name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || ''),
      confirm_password: String(formData.get('confirm_password') || ''),
      phone: String(formData.get('phone') || '').trim(),
      date_of_birth: String(formData.get('date_of_birth') || '').trim(),
      gender: String(formData.get('gender') || '').trim(),
      specialist_id: Number(formData.get('specialist_id')),
      branch_id: Number(formData.get('branch_id')),
      bio: String(formData.get('bio') || '').trim()
    };

    const validationError = validateDoctorPayload(payload, isEditMode);
    if (validationError) {
      showFormMessage(validationError, 'error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : 'Save';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = isEditMode ? 'Updating...' : 'Adding...';
    }

    try {
      const endpoint = isEditMode ? `${API_BASE}/admin/doctors.php` : `${API_BASE}/admin/add-doctor.php`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        showFormMessage(result.message || `Failed to ${isEditMode ? 'update' : 'add'} doctor`, 'error');
        return;
      }

      showFormMessage(`Doctor ${isEditMode ? 'updated' : 'added'} successfully!`, 'success');
      if (!isEditMode) {
        form.reset();
      }
    } catch (error) {
      console.error('Doctor submit error:', error);
      showFormMessage('Could not connect to server. Please try again.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

function validateDoctorPayload(payload, editMode) {
  const requiredTextFields = [
    payload.full_name,
    payload.email,
    payload.phone,
    payload.date_of_birth,
    payload.gender,
    payload.bio
  ];

  if (!editMode) {
    requiredTextFields.push(payload.password, payload.confirm_password);
  }

  if (requiredTextFields.some((value) => !value)) {
    return 'Please fill in all required fields';
  }

  if (!Number.isFinite(payload.specialist_id) || payload.specialist_id <= 0) {
    return 'Please select a specialist';
  }

  if (!Number.isFinite(payload.branch_id) || payload.branch_id <= 0) {
    return 'Please select a branch';
  }

  const phoneRegex = /^[0-9+\s\-()+]{7,20}$/;
  if (!phoneRegex.test(payload.phone)) {
    return 'Phone number can only contain numbers, spaces, +, parentheses, and dashes';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(payload.email)) {
    return 'Please enter a valid email address';
  }

  const hasPasswordInput = payload.password.length > 0 || payload.confirm_password.length > 0;
  if (!editMode || hasPasswordInput) {
    if (!payload.password || !payload.confirm_password) {
      return 'Please provide both password fields';
    }
    if (payload.password !== payload.confirm_password) {
      return 'Passwords do not match';
    }
  }

  return null;
}

async function loadDoctorForEdit(form) {
  const result = await fetchJson(`${API_BASE}/admin/doctors.php?doctor_id=${doctorIdParam}`);
  if (!result.success || !result.data) {
    throw new Error(result.message || 'Could not load doctor details');
  }

  const doctor = result.data;
  form.elements.full_name.value = doctor.full_name || '';
  form.elements.email.value = doctor.email || '';
  form.elements.phone.value = doctor.phone || '';
  form.elements.date_of_birth.value = doctor.date_of_birth || '';
  form.elements.gender.value = doctor.gender || '';
  form.elements.specialist_id.value = String(doctor.specialist_id || '');
  form.elements.branch_id.value = String(doctor.branch_id || '');
  form.elements.bio.value = doctor.bio || '';
}

async function loadSpecialists() {
  const specialistSelect = document.getElementById('specialistId');
  if (!specialistSelect) return;

  const result = await fetchJson(`${API_BASE}/specialists.php`);
  if (!result.success || !Array.isArray(result.data)) {
    specialistSelect.innerHTML = '<option value="">Failed to load specialists</option>';
    throw new Error(result.message || 'Could not fetch specialists');
  }

  specialistSelect.innerHTML = '<option value="">Select specialist</option>';
  result.data.forEach((specialist) => {
    const option = document.createElement('option');
    option.value = specialist.id;
    option.textContent = specialist.name;
    specialistSelect.appendChild(option);
  });
}

async function loadBranches() {
  const branchSelect = document.getElementById('branchId');
  if (!branchSelect) return;

  const result = await fetchJson(`${API_BASE}/branches.php`);
  if (!result.success || !Array.isArray(result.data)) {
    branchSelect.innerHTML = '<option value="">Failed to load branches</option>';
    throw new Error(result.message || 'Could not fetch branches');
  }

  branchSelect.innerHTML = '<option value="">Select branch</option>';
  result.data.forEach((branch) => {
    const option = document.createElement('option');
    option.value = branch.id;
    option.textContent = `${branch.name} (${branch.city})`;
    branchSelect.appendChild(option);
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options
  });
  return response.json();
}

function showFormMessage(message, type) {
  const messageElement = document.getElementById('formMessage');
  if (!messageElement) return;

  messageElement.className = `form-message ${type}`;
  messageElement.textContent = message;
}

function hideFormMessage() {
  const messageElement = document.getElementById('formMessage');
  if (!messageElement) return;

  messageElement.className = 'form-message';
  messageElement.textContent = '';
}
