// Login.js - Login page functionality

const API_BASE = window.API_BASE || 'http://localhost/check-me-up/backend/api';
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const LOCKOUT_STORAGE_KEY = 'checkmeup_login_lockout_until';

document.addEventListener('DOMContentLoaded', () => {
  // checkExistingSession(); // COMMENTED OUT FOR FRONTEND DEMO
  initializePasswordToggle();
  initializeLoginForm();
  checkRegistrationSuccess();
  checkBookingRedirectMessage();
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
        window.location.replace('doctor-dashboard.html');
      } else if (role === 'admin') {
        window.location.replace('admin-dashboard.html');
      } else {
        window.location.replace('profile.html');
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

function checkBookingRedirectMessage() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingMessage = urlParams.get('message');
  if (!bookingMessage) {
    return;
  }

  const loginCard = document.querySelector('.login-card');
  if (!loginCard) {
    return;
  }

  const infoBanner = document.createElement('div');
  infoBanner.className = 'success-banner fade-in';
  infoBanner.style.backgroundColor = '#2563EB';
  infoBanner.style.color = 'white';
  infoBanner.style.padding = '1rem';
  infoBanner.style.borderRadius = '0.5rem';
  infoBanner.style.marginBottom = '1.5rem';
  infoBanner.style.textAlign = 'center';
  infoBanner.style.fontWeight = '600';
  infoBanner.textContent = bookingMessage;
  loginCard.insertBefore(infoBanner, loginCard.firstChild);
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

  if (!loginForm || !emailInput || !passwordInput) {
    return;
  }

  const loginButton = loginForm.querySelector('.btn-login');
  if (!loginButton) {
    return;
  }

  const togglePassword = document.getElementById('togglePassword');
  const defaultButtonText = loginButton.textContent.trim() || 'Log In';
  let lockoutUntil = Number(localStorage.getItem(LOCKOUT_STORAGE_KEY) || '0');
  let lockoutTimer = null;

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

  const setControlsDisabled = (disabled) => {
    loginForm.querySelectorAll('input, button').forEach((element) => {
      element.disabled = disabled;
    });

    if (togglePassword) {
      togglePassword.style.pointerEvents = disabled ? 'none' : '';
      togglePassword.style.opacity = disabled ? '0.5' : '';
    }
  };

  const formatCountdown = (remainingSeconds) => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const clearLockout = () => {
    lockoutUntil = 0;
    localStorage.removeItem(LOCKOUT_STORAGE_KEY);

    if (lockoutTimer) {
      clearInterval(lockoutTimer);
      lockoutTimer = null;
    }

    setControlsDisabled(false);
    loginButton.classList.remove('btn-loading');
    loginButton.textContent = defaultButtonText;

    if (accountErrorBanner) {
      accountErrorBanner.textContent = '';
      accountErrorBanner.classList.remove('visible');
    }
  };

  const startLockout = (untilTimestamp) => {
    lockoutUntil = untilTimestamp;
    localStorage.setItem(LOCKOUT_STORAGE_KEY, String(untilTimestamp));
    setControlsDisabled(true);
    loginButton.classList.remove('btn-loading');

    if (lockoutTimer) {
      clearInterval(lockoutTimer);
    }

    const updateLockoutState = () => {
      const remainingSeconds = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));

      if (remainingSeconds <= 0) {
        clearLockout();
        return;
      }

      loginButton.textContent = `Locked ${formatCountdown(remainingSeconds)}`;

      if (accountErrorBanner) {
        accountErrorBanner.textContent = `Too many failed attempts. Please wait ${formatCountdown(remainingSeconds)} before trying again.`;
        accountErrorBanner.classList.add('visible');
      }

      if (errorMessage) {
        errorMessage.textContent = '';
      }
    };

    updateLockoutState();
    lockoutTimer = setInterval(updateLockoutState, 1000);
  };

  const restoreLockoutState = () => {
    if (lockoutUntil > Date.now()) {
      startLockout(lockoutUntil);
    } else {
      clearLockout();
    }
  };

  const triggerPasswordShake = () => {
    passwordInput.classList.remove('shake');
    // Force reflow so the animation can replay on repeated wrong attempts.
    void passwordInput.offsetWidth;
    passwordInput.classList.add('shake');
  };

  const handleLoginFailure = (code, fallbackMessage) => {
    switch (code) {
      case 'RATE_LIMITED':
        startLockout(Date.now() + LOCKOUT_DURATION_MS);
        break;
      case 'INVALID_CREDENTIALS':
        if (errorMessage) {
          errorMessage.textContent = fallbackMessage || 'Invalid email or password.';
        }
        triggerPasswordShake();
        break;
      case 'MISSING_FIELDS':
        if (emailError) {
          emailError.textContent = 'Please enter your email.';
        }
        if (passwordError) {
          passwordError.textContent = 'Please enter your password.';
        }
        break;
      default:
        if (errorMessage) {
          errorMessage.textContent = fallbackMessage || 'Login failed. Please try again.';
        }
        break;
    }
  };

  emailInput.addEventListener('input', clearEmailError);
  passwordInput.addEventListener('input', clearPasswordError);

  restoreLockoutState();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (Date.now() < lockoutUntil) {
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
    loginButton.classList.add('btn-loading');
    loginButton.disabled = true;
    loginButton.textContent = 'Signing in...';

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
        clearLockout();

        localStorage.setItem('checkmeup_user', JSON.stringify(payload.data));
        localStorage.setItem('checkmeup_role', payload.data.role);

        const role = payload.data.role;
        if (role === 'doctor') {
          window.location.replace('doctor-dashboard.html');
        } else if (role === 'admin') {
          window.location.replace('admin-dashboard.html');
        } else {
          window.location.replace('profile.html');
        }
        return;
      }

      handleLoginFailure(payload?.code, payload?.message || 'Login failed. Please try again.');
    } catch (error) {
      console.error('Login error:', error);
      if (errorMessage) {
        errorMessage.textContent = 'Could not connect to server. Please make sure the app is running.';
      }
    } finally {
      if (Date.now() >= lockoutUntil) {
        loginButton.classList.remove('btn-loading');
        loginButton.disabled = false;
        loginButton.textContent = originalText;
      }
    }
  });
}
