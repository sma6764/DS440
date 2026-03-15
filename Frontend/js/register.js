// Register.js - Registration page functionality

const API_BASE = 'http://localhost/check-me-up/backend/api';

document.addEventListener('DOMContentLoaded', () => {
  // checkExistingSession(); // COMMENTED OUT FOR FRONTEND DEMO
  initializePasswordStrength();
  initializePasswordMatch();
  initializeRegistrationForm();
});

// Check if user is already logged in
function checkExistingSession() {
  const userDataStr = localStorage.getItem('checkmeup_user');
  if (userDataStr) {
    // User is already logged in, redirect to profile
    window.location.href = 'profile.html';
  }
}

// Password Strength Checker
function initializePasswordStrength() {
  const passwordInput = document.getElementById('password');
  const strengthBar = document.getElementById('strengthBar');
  const strengthText = document.getElementById('strengthText');

  if (passwordInput && strengthBar && strengthText) {
    passwordInput.addEventListener('input', () => {
      const password = passwordInput.value;
      const strength = calculatePasswordStrength(password);

      // Remove all strength classes
      strengthBar.classList.remove('weak', 'medium', 'strong');
      strengthText.classList.remove('weak', 'medium', 'strong');

      // Add appropriate strength class and text
      if (password.length === 0) {
        strengthText.textContent = '';
        return;
      }

      strengthBar.classList.add(strength);
      strengthText.classList.add(strength);

      if (strength === 'weak') {
        strengthText.textContent = 'Weak password';
      } else if (strength === 'medium') {
        strengthText.textContent = 'Medium password';
      } else if (strength === 'strong') {
        strengthText.textContent = 'Strong password';
      }
    });
  }
}

// Calculate Password Strength
function calculatePasswordStrength(password) {
  const length = password.length;
  const hasNumbers = /\d/.test(password);
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Weak: Less than 6 characters
  if (length < 6) {
    return 'weak';
  }

  // Strong: 8+ characters with letters and numbers (or special chars)
  if (length >= 8 && hasLetters && (hasNumbers || hasSpecialChars)) {
    return 'strong';
  }

  // Medium: 6+ characters or has numbers
  if (length >= 6 || hasNumbers) {
    return 'medium';
  }

  return 'weak';
}

// Confirm Password Match Checker
function initializePasswordMatch() {
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const matchIndicator = document.getElementById('matchIndicator');

  if (passwordInput && confirmPasswordInput && matchIndicator) {
    // Check on both inputs
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    passwordInput.addEventListener('input', checkPasswordMatch);

    function checkPasswordMatch() {
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      // Clear indicator if confirm field is empty
      if (confirmPassword.length === 0) {
        matchIndicator.textContent = '';
        matchIndicator.classList.remove('match', 'no-match');
        return;
      }

      // Check if passwords match
      if (password === confirmPassword) {
        matchIndicator.textContent = '✓';
        matchIndicator.classList.remove('no-match');
        matchIndicator.classList.add('match');
      } else {
        matchIndicator.textContent = '✗';
        matchIndicator.classList.remove('match');
        matchIndicator.classList.add('no-match');
      }
    }
  }
}

// Registration Form Validation and Submission
function initializeRegistrationForm() {
  const registerForm = document.getElementById('registerForm');
  const errorMessage = document.getElementById('errorMessage');
  const registerButton = registerForm.querySelector('.btn-register');

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Clear previous error
    errorMessage.textContent = '';

    // Get all input values
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const dob = document.getElementById('dob').value;
    const gender = document.getElementById('gender').value;
    const insurance = document.getElementById('insurance').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsChecked = document.getElementById('termsCheckbox').checked;

    // Validate all fields are filled
    if (!fullName || !email || !phone || !dob || !gender || !insurance || !password || !confirmPassword) {
      errorMessage.textContent = 'Please fill in all fields';
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errorMessage.textContent = 'Please enter a valid email address';
      return;
    }

    // Validate password strength
    const strength = calculatePasswordStrength(password);
    if (strength === 'weak') {
      errorMessage.textContent = 'Password is too weak. Use at least 6 characters';
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      errorMessage.textContent = 'Passwords do not match';
      return;
    }

    // Validate terms checkbox
    if (!termsChecked) {
      errorMessage.textContent = 'Please agree to the Terms & Conditions';
      return;
    }

    // Show loading state
    const originalText = registerButton.textContent;
    registerButton.classList.add('btn-loading');
    registerButton.disabled = true;

    // Prepare data for API
    const registrationData = {
      full_name: fullName,
      email: email,
      phone: phone,
      date_of_birth: dob,
      gender: gender,
      insurance_company: insurance === 'none' ? null : insurance,
      password: password,
      confirm_password: confirmPassword
    };

    // Send registration request to backend
    fetch(`${API_BASE}/auth/register.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registrationData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      // Remove loading state
      registerButton.classList.remove('btn-loading');
      registerButton.disabled = false;
      registerButton.textContent = originalText;

      if (data.success) {
        // Redirect to login page with success parameter
        window.location.href = 'login.html?registered=true';
      } else {
        // Show error message from API
        errorMessage.textContent = data.message || 'Registration failed. Please try again.';
        errorMessage.style.color = 'red';
      }
    })
    .catch(error => {
      // Remove loading state
      registerButton.classList.remove('btn-loading');
      registerButton.disabled = false;
      registerButton.textContent = originalText;

      // Show connection error
      errorMessage.textContent = 'Could not connect to server. Please make sure the app is running.';
      errorMessage.style.color = 'red';
      console.error('Registration error:', error);
    });
  });
}
