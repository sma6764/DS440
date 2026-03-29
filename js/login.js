// Login.js - Login page functionality

const API_BASE = window.API_BASE || 'http://localhost/check-me-up/backend/api';
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

let failedAttempts = 0;
let lockoutUntil = 0;
let lockoutTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  // checkExistingSession(); // COMMENTED OUT FOR FRONTEND DEMO
  initializePasswordToggle();
  initializeLoginForm();
  checkRegistrationSuccess();
});

// Check if user is already logged in
function checkExistingSession() {
  fetch(`${API_BASE}/auth/session.php`, {
    method: 'GET',
    credentials: 'include'
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      // User is already logged in, redirect to appropriate page
      const role = result.data.role;
      if (role === 'doctor') {
        window.location.href = 'doctor-dashboard.html';
      } else if (role === 'admin') {
        window.location.href = 'admin-dashboard.html';
      } else {
        window.location.href = 'profile.html';
      }
    }
  })
  .catch(error => {
    console.error('Session check error:', error);
    // Continue to login page
  });
}

// Check for registration success message via URL parameter
function checkRegistrationSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('registered') === 'true') {
    // Display success banner
    const loginCard = document.querySelector('.login-card');
    const successBanner = document.createElement('div');
    successBanner.className = 'success-banner fade-in';
    successBanner.style.backgroundColor = '#34D399';
    successBanner.style.color = 'white';
    successBanner.style.padding = '1rem';
    successBanner.style.borderRadius = '0.5rem';
    successBanner.style.marginBottom = '1.5rem';
    successBanner.style.textAlign = 'center';
    successBanner.style.fontWeight = '600';
    successBanner.textContent = 'Account created successfully! Please log in.';
    
    loginCard.insertBefore(successBanner, loginCard.firstChild);
    
    // Remove banner after 5 seconds
    setTimeout(() => {
      successBanner.classList.add('fade-out');
      setTimeout(() => {
        successBanner.remove();
      }, 400);
    }, 5000);
  }
}

// Password Show/Hide Toggle
function initializePasswordToggle() {
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      // Toggle password visibility
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;

      // Toggle eye icon (closed/open)
      togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
    });
  }
}

// Login Form Validation and Submission
function initializeLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const accountErrorBanner = document.getElementById('accountErrorBanner');
  const errorMessage = document.getElementById('errorMessage');
  const loginButton = loginForm.querySelector('.btn-login');

  if (!loginForm || !emailInput || !passwordInput || !loginButton) {
    return;
  }

  const clearAllErrors = () => {
    if (emailError) emailError.textContent = '';
    if (passwordError) passwordError.textContent = '';
    if (errorMessage) errorMessage.textContent = '';
    if (accountErrorBanner) {
      accountErrorBanner.textContent = '';
      accountErrorBanner.classList.remove('visible');
    }
  };

  const clearEmailError = () => {
    if (emailError) emailError.textContent = '';
    if (errorMessage) errorMessage.textContent = '';
    if (accountErrorBanner) {
      accountErrorBanner.textContent = '';
      accountErrorBanner.classList.remove('visible');
    }
  };

  const clearPasswordError = () => {
    if (passwordError) passwordError.textContent = '';
    if (errorMessage) errorMessage.textContent = '';
    if (accountErrorBanner) {
      accountErrorBanner.textContent = '';
      accountErrorBanner.classList.remove('visible');
    }
    passwordInput.classList.remove('shake');
  };

  const setButtonBusyState = (isBusy, label) => {
    if (isBusy) {
      loginButton.classList.add('btn-loading');
      loginButton.disabled = true;
      return;
    }

    loginButton.classList.remove('btn-loading');
    loginButton.textContent = label;

    if (Date.now() < lockoutUntil) {
      loginButton.disabled = true;
    } else {
      loginButton.disabled = false;
    }
  };

  const showBannerError = (message) => {
    if (!accountErrorBanner) return;
    accountErrorBanner.textContent = message;
    accountErrorBanner.classList.add('visible');
  };

  const triggerPasswordShake = () => {
    passwordInput.classList.remove('shake');
    // Force reflow so the animation can replay on repeated wrong attempts.
    void passwordInput.offsetWidth;
    passwordInput.classList.add('shake');
  };

  const setLockoutState = () => {
    lockoutUntil = Date.now() + LOCKOUT_SECONDS * 1000;
    loginButton.classList.remove('btn-loading');
    loginButton.disabled = true;

    const updateLockoutMessage = () => {
      const remainingSeconds = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      if (errorMessage) {
        if (remainingSeconds > 0) {
          errorMessage.textContent = `Too many failed attempts. Please wait ${remainingSeconds} seconds.`;
        } else {
          errorMessage.textContent = '';
        }
      }

      if (remainingSeconds <= 0) {
        clearInterval(lockoutTimer);
        lockoutTimer = null;
        failedAttempts = 0;
        lockoutUntil = 0;
        loginButton.disabled = false;
      }
    };

    updateLockoutMessage();
    if (lockoutTimer) {
      clearInterval(lockoutTimer);
    }
    lockoutTimer = setInterval(updateLockoutMessage, 1000);
  };

  const handleLoginFailure = (code, fallbackMessage, emailValue, passwordValue) => {
    switch (code) {
      case 'EMAIL_NOT_FOUND':
        if (emailError) emailError.textContent = 'No account found with this email.';
        failedAttempts += 1;
        break;
      case 'WRONG_PASSWORD':
        if (passwordError) passwordError.textContent = 'Incorrect password. Please try again.';
        triggerPasswordShake();
        failedAttempts += 1;
        break;
      case 'ACCOUNT_INACTIVE':
        showBannerError('Your account has been deactivated. Contact support at hello@checkmeup.com');
        failedAttempts += 1;
        break;
      case 'MISSING_FIELDS':
        if (!emailValue && emailError) {
          emailError.textContent = 'Please enter your email.';
        }
        if (!passwordValue && passwordError) {
          passwordError.textContent = 'Please enter your password.';
        }
        break;
      default:
        if (errorMessage) {
          errorMessage.textContent = fallbackMessage || 'Login failed. Please try again.';
        }
        failedAttempts += 1;
        break;
    }

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      setLockoutState();
    }
  };

  emailInput.addEventListener('input', clearEmailError);
  passwordInput.addEventListener('input', clearPasswordError);

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (Date.now() < lockoutUntil) {
      if (errorMessage) {
        const remaining = Math.max(1, Math.ceil((lockoutUntil - Date.now()) / 1000));
        errorMessage.textContent = `Too many failed attempts. Please wait ${remaining} seconds.`;
      }
      return;
    }

    clearAllErrors();

    // Get input values
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Validate inputs
    if (!email || !password) {
      if (!email && emailError) {
        emailError.textContent = 'Please enter your email.';
      }
      if (!password && passwordError) {
        passwordError.textContent = 'Please enter your password.';
      }
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (emailError) {
        emailError.textContent = 'Please enter a valid email address.';
      }
      return;
    }

    // Show loading state
    const originalText = loginButton.textContent;
    setButtonBusyState(true, originalText);

    try {
      const response = await fetch(`${API_BASE}/auth/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password
        })
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (parseError) {
        payload = null;
      }

      const success = Boolean(payload?.success) && response.ok;

      if (success) {
        failedAttempts = 0;

        localStorage.setItem('checkmeup_user', JSON.stringify(payload.data));
        localStorage.setItem('checkmeup_role', payload.data.role);

        const role = payload.data.role;
        if (role === 'doctor') {
          window.location.href = 'doctor-dashboard.html';
        } else if (role === 'admin') {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'profile.html';
        }
        return;
      }

      handleLoginFailure(payload?.code, payload?.message || 'Login failed. Please try again.', email, password);
    } catch (error) {
      console.error('Login error:', error);
      if (errorMessage) {
        errorMessage.textContent = 'Could not connect to server. Please make sure the app is running.';
      }
    } finally {
      setButtonBusyState(false, originalText);
    }
  });
}
