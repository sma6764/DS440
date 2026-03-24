const API_BASE = window.API_BASE || 'http://localhost/check-me-up/backend/api';

const ADMIN_KEYS = ['user_role', 'checkmeup_role'];

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAdminSession()) {
    return;
  }

  initializeDoctorForm();
  loadSpecialists();
  loadBranches();
});

function checkAdminSession() {
  const role = ADMIN_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);

  if (role !== 'admin') {
    window.location.href = 'login.html';
    return false;
  }

  return true;
}

function initializeDoctorForm() {
  const form = document.getElementById('addDoctorForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormMessage();

    const formData = new FormData(form);
    const payload = {
      full_name: String(formData.get('full_name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || ''),
      confirm_password: String(formData.get('confirm_password') || ''),
      phone: String(formData.get('phone') || '').trim(),
      date_of_birth: String(formData.get('date_of_birth') || '').trim(),
      gender: String(formData.get('gender') || '').trim(),
      specialist_id: Number(formData.get('specialist_id')),
      branch_id: Number(formData.get('branch_id')),
      bio: String(formData.get('bio') || '').trim(),
      rating: Number(formData.get('rating'))
    };

    const validationError = validateDoctorPayload(payload);
    if (validationError) {
      showFormMessage(validationError, 'error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : 'Add Doctor';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Adding...';
    }

    try {
      const response = await fetch(`${API_BASE}/admin/add-doctor.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        showFormMessage(result.message || 'Failed to add doctor', 'error');
        return;
      }

      showFormMessage('Doctor added successfully!', 'success');
      form.reset();
    } catch (error) {
      console.error('Add doctor error:', error);
      showFormMessage('Could not connect to server. Please try again.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

function validateDoctorPayload(payload) {
  const requiredTextFields = [
    payload.full_name,
    payload.email,
    payload.password,
    payload.confirm_password,
    payload.phone,
    payload.date_of_birth,
    payload.gender,
    payload.bio
  ];

  if (requiredTextFields.some((value) => !value)) {
    return 'Please fill in all fields';
  }

  if (!Number.isFinite(payload.specialist_id) || payload.specialist_id <= 0) {
    return 'Please select a specialist';
  }

  if (!Number.isFinite(payload.branch_id) || payload.branch_id <= 0) {
    return 'Please select a branch';
  }

  if (!Number.isFinite(payload.rating) || payload.rating < 0 || payload.rating > 5) {
    return 'Rating must be between 0.0 and 5.0';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(payload.email)) {
    return 'Please enter a valid email address';
  }

  if (payload.password !== payload.confirm_password) {
    return 'Passwords do not match';
  }

  return null;
}

async function loadSpecialists() {
  const specialistSelect = document.getElementById('specialistId');
  if (!specialistSelect) return;

  try {
    const response = await fetch(`${API_BASE}/specialists.php`, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();
    if (!response.ok || !result.success || !Array.isArray(result.data)) {
      throw new Error(result.message || 'Could not fetch specialists');
    }

    specialistSelect.innerHTML = '<option value="">Select specialist</option>';
    result.data.forEach((specialist) => {
      const option = document.createElement('option');
      option.value = specialist.id;
      option.textContent = specialist.name;
      specialistSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Specialist fetch error:', error);
    specialistSelect.innerHTML = '<option value="">Failed to load specialists</option>';
  }
}

async function loadBranches() {
  const branchSelect = document.getElementById('branchId');
  if (!branchSelect) return;

  try {
    const response = await fetch(`${API_BASE}/branches.php`, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();
    if (!response.ok || !result.success || !Array.isArray(result.data)) {
      throw new Error(result.message || 'Could not fetch branches');
    }

    branchSelect.innerHTML = '<option value="">Select branch</option>';
    result.data.forEach((branch) => {
      const option = document.createElement('option');
      option.value = branch.id;
      option.textContent = `${branch.name} (${branch.city})`;
      branchSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Branch fetch error:', error);
    branchSelect.innerHTML = '<option value="">Failed to load branches</option>';
  }
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
