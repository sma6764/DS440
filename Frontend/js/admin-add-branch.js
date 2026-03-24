const API_BASE = window.API_BASE || 'http://localhost/check-me-up/backend/api';

const ADMIN_KEYS = ['user_role', 'checkmeup_role'];

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAdminSession()) {
    return;
  }

  initializeBranchForm();
});

function checkAdminSession() {
  const role = ADMIN_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);

  if (role !== 'admin') {
    window.location.href = 'login.html';
    return false;
  }

  return true;
}

function initializeBranchForm() {
  const form = document.getElementById('addBranchForm');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormMessage();

    const formData = new FormData(form);
    const payload = {
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
    const originalText = submitButton ? submitButton.textContent : 'Add Branch';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Adding...';
    }

    try {
      const response = await fetch(`${API_BASE}/admin/add-branch.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        showFormMessage(result.message || 'Failed to add branch', 'error');
        return;
      }

      showFormMessage('Branch added successfully!', 'success');
      form.reset();
    } catch (error) {
      console.error('Add branch error:', error);
      showFormMessage('Could not connect to server. Please try again.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
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
