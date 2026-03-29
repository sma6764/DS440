const API_BASE = window.API_BASE || 'http://localhost/check-me-up/backend/api';

const ADMIN_KEYS = ['user_role', 'checkmeup_role'];
const branchIdParam = Number(new URLSearchParams(window.location.search).get('branch_id') || 0);
const isEditMode = Number.isFinite(branchIdParam) && branchIdParam > 0;

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAdminSession()) {
    return;
  }

  const form = document.getElementById('addBranchForm');
  if (!form) return;

  configureFormForMode(form);

  if (isEditMode) {
    try {
      await loadBranchForEdit(form);
    } catch (error) {
      console.error('Load branch error:', error);
      showFormMessage('Could not load branch details. Please refresh and try again.', 'error');
    }
  }

  initializeBranchForm(form);
});

function checkAdminSession() {
  const role = ADMIN_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);

  if (role !== 'admin') {
    window.location.href = 'login.html';
    return false;
  }

  return true;
}

function configureFormForMode(form) {
  if (!isEditMode) return;

  const pageTitle = document.querySelector('.page-title-wrap .section-title');
  const pageSubtitle = document.querySelector('.page-title-wrap .page-subtitle');
  const submitButton = form.querySelector('button[type="submit"]');

  if (pageTitle) pageTitle.textContent = 'Edit Branch';
  if (pageSubtitle) pageSubtitle.textContent = 'Update branch location details';
  if (submitButton) submitButton.textContent = 'Update Branch';
}

function initializeBranchForm(form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormMessage();

    const formData = new FormData(form);
    const payload = {
      branch_id: branchIdParam,
      name: String(formData.get('name') || '').trim(),
      address: String(formData.get('address') || '').trim(),
      city: String(formData.get('city') || '').trim(),
      phone: String(formData.get('phone') || '').trim()
    };

    if (!payload.name || !payload.address || !payload.city || !payload.phone) {
      showFormMessage('Please fill in all fields', 'error');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : 'Save Branch';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = isEditMode ? 'Updating...' : 'Adding...';
    }

    try {
      const response = await fetch(`${API_BASE}/admin/add-branch.php`, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        showFormMessage(result.message || `Failed to ${isEditMode ? 'update' : 'add'} branch`, 'error');
        return;
      }

      showFormMessage(`Branch ${isEditMode ? 'updated' : 'added'} successfully!`, 'success');
      if (!isEditMode) {
        form.reset();
      }
    } catch (error) {
      console.error('Branch submit error:', error);
      showFormMessage('Could not connect to server. Please try again.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

async function loadBranchForEdit(form) {
  const result = await fetchJson(`${API_BASE}/branches.php?branch_id=${branchIdParam}`);
  if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
    throw new Error(result.message || 'Branch not found');
  }

  const branch = result.data[0];
  form.elements.name.value = branch.name || '';
  form.elements.address.value = branch.address || '';
  form.elements.city.value = branch.city || '';
  form.elements.phone.value = branch.phone || '';
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
