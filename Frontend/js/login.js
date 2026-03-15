// Login.js - Login page functionality

const API_BASE = 'http://localhost/check-me-up/backend/api';

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
  const errorMessage = document.getElementById('errorMessage');
  const loginButton = loginForm.querySelector('.btn-login');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Clear previous error
    errorMessage.textContent = '';

    // Get input values
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Validate inputs
    if (!email || !password) {
      errorMessage.textContent = 'Please fill in all fields';
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errorMessage.textContent = 'Please enter a valid email address';
      return;
    }

    // Show loading state
    const originalText = loginButton.textContent;
    loginButton.classList.add('btn-loading');
    loginButton.disabled = true;

    // Send login request to backend
    fetch(`${API_BASE}/auth/login.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: email,
        password: password
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      // Remove loading state
      loginButton.classList.remove('btn-loading');
      loginButton.disabled = false;
      loginButton.textContent = originalText;

      if (data.success) {
        // Store user data in localStorage
        localStorage.setItem('checkmeup_user', JSON.stringify(data.data));
        localStorage.setItem('checkmeup_role', data.data.role);
        
        // Redirect based on role
        const role = data.data.role;
        if (role === 'doctor') {
          window.location.href = 'doctor-dashboard.html';
        } else if (role === 'admin') {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'profile.html';
        }
      } else {
        // Show error message from API
        errorMessage.textContent = data.message || 'Login failed. Please try again.';
        errorMessage.style.color = 'red';
      }
    })
    .catch(error => {
      // Remove loading state
      loginButton.classList.remove('btn-loading');
      loginButton.disabled = false;
      loginButton.textContent = originalText;

      // Show connection error
      errorMessage.textContent = 'Could not connect to server. Please make sure the app is running.';
      errorMessage.style.color = 'red';
      console.error('Login error:', error);
    });
  });
}
