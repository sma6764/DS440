// Navbar.js - Dynamic navbar authentication state and theme toggle

const THEME_STORAGE_KEY = 'theme';

document.addEventListener('DOMContentLoaded', () => {
  initializeThemeToggleState();
  updateNavbarAuthState();
  initializeNavbarMenu();
  initializeFooterContactInfo();
});

if (!window.API_BASE) {
  window.API_BASE = 'http://localhost/check-me-up/backend/api';
}

function clearAuthLocalStorage() {
  localStorage.removeItem('checkmeup_user');
  localStorage.removeItem('checkmeup_role');
  localStorage.removeItem('user_role');
}

function getStoredTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  return resolvedTheme;
}

function updateThemeToggleButton(button, theme) {
  if (!button) return;

  const icon = button.querySelector('.theme-toggle-icon');
  if (icon) {
    icon.textContent = theme === 'light' ? '☀️' : '🌙';
  }

  button.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  button.setAttribute('title', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
}

function initializeThemeToggleState() {
  const theme = applyTheme(getStoredTheme());
  const toggleButton = document.querySelector('.theme-toggle');
  updateThemeToggleButton(toggleButton, theme);
}

function bindThemeToggleButton(toggleButton) {
  if (!toggleButton || toggleButton.dataset.bound === 'true') return;

  toggleButton.dataset.bound = 'true';
  toggleButton.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    updateThemeToggleButton(toggleButton, nextTheme);
  });
}

function ensureThemeToggle(navLinks) {
  let toggleButton = navLinks.querySelector('.theme-toggle');

  if (!toggleButton) {
    toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'theme-toggle nav-cta nav-theme-toggle';

    const icon = document.createElement('span');
    icon.className = 'theme-toggle-icon';
    toggleButton.appendChild(icon);

    const insertionTarget =
      navLinks.querySelector('a.nav-cta-book') ||
      navLinks.querySelector('a.nav-cta-check') ||
      navLinks.querySelector('a[href="login.html"]') ||
      navLinks.querySelector('a[href="profile.html"], a[href="doctor-dashboard.html"], a[href="admin-dashboard.html"], a[href="logout.html"]');

    if (insertionTarget) {
      navLinks.insertBefore(toggleButton, insertionTarget);
    } else {
      navLinks.appendChild(toggleButton);
    }
  }

  updateThemeToggleButton(toggleButton, getStoredTheme());
  bindThemeToggleButton(toggleButton);
}

function renderLoggedOutNavbarState(navbar, navLinks) {
  const dynamicAuthSelectors = [
    'a[href="profile.html"]',
    'a[href="doctor-dashboard.html"]',
    'a[href="admin-dashboard.html"]',
    'a[href="logout.html"]'
  ];

  dynamicAuthSelectors.forEach((selector) => {
    navLinks.querySelectorAll(selector).forEach((element) => element.remove());
  });

  navLinks.querySelectorAll('span').forEach((element) => {
    if (element.textContent && element.textContent.trim().startsWith('Hi,')) {
      element.remove();
    }
  });

  let loginButton = navbar.querySelector('a[href="login.html"]');
  if (!loginButton) {
    loginButton = document.createElement('a');
    loginButton.href = 'login.html';
    loginButton.textContent = 'Login';
    loginButton.className = 'btn-primary';
    navLinks.appendChild(loginButton);
  }
}

async function updateNavbarAuthState() {
  // Read local user data, but validate login status from the active server session.
  const userDataStr = localStorage.getItem('checkmeup_user');
  const role = localStorage.getItem('checkmeup_role');
  
  // Find the navbar container (different pages have different structures)
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const navLinks = navbar.querySelector('.nav-links');
  if (!navLinks) return;

  ensureThemeToggle(navLinks);
  ensureNavbarCtas(navLinks);

  let sessionActive = false;
  try {
    const sessionResponse = await fetch(`${API_BASE}/auth/session.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const sessionData = await sessionResponse.json();
    sessionActive = !!sessionData.success;
  } catch (error) {
    console.warn('Could not verify session state:', error);
    sessionActive = false;
  }

  if (!sessionActive) {
    clearAuthLocalStorage();
    renderLoggedOutNavbarState(navbar, navLinks);
    return;
  }
  
  // Find the login button in navbar
  const loginButton = navbar.querySelector('a[href="login.html"]');
  if (!loginButton) return;
  
  if (userDataStr && role) {
    // User is logged in
    try {
      const userData = JSON.parse(userDataStr);
      const firstName = userData.name.split(' ')[0]; // Get first name
      
      // Replace login button with greeting and profile/dashboard link
      const navLinks = loginButton.parentElement;
      
      // Remove login button
      loginButton.remove();
      
      // Create greeting text
      const greeting = document.createElement('span');
      greeting.style.color = 'var(--color-text-muted)';
      greeting.style.marginRight = '1.5rem';
      greeting.style.fontSize = '0.95rem';
      greeting.textContent = `Hi, ${firstName}`;
      
      // Create profile/dashboard link based on role
      const profileLink = document.createElement('a');
      profileLink.style.marginRight = '1rem';
      
      if (role === 'doctor') {
        profileLink.href = 'doctor-dashboard.html';
        profileLink.textContent = 'My Dashboard';
      } else if (role === 'admin') {
        profileLink.href = 'admin-dashboard.html';
        profileLink.textContent = 'Admin Panel';
      } else {
        profileLink.href = 'profile.html';
        profileLink.textContent = 'My Profile';
      }
      
      // Create logout link
      const logoutLink = document.createElement('a');
      logoutLink.href = 'logout.html';
      logoutLink.textContent = 'Logout';
      logoutLink.style.color = 'var(--color-error)';
      
      // Append new elements to navbar
      navLinks.appendChild(greeting);
      navLinks.appendChild(profileLink);
      navLinks.appendChild(logoutLink);
      
    } catch (error) {
      console.error('Error parsing user data:', error);
      // Keep login button if parsing fails
    }
  }
  // If not logged in, keep the login button as is
}

function initializeNavbarMenu() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const navbarContent = navbar.querySelector('.navbar-content') || navbar.querySelector('.container') || navbar;
  const navLinks = navbar.querySelector('.nav-links');
  if (!navbarContent || !navLinks) return;

  ensureThemeToggle(navLinks);
  ensureNavbarCtas(navLinks);

  let toggleButton = navbar.querySelector('.nav-toggle');

  if (!toggleButton) {
    toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'nav-toggle';
    toggleButton.setAttribute('aria-label', 'Toggle navigation menu');
    toggleButton.setAttribute('aria-expanded', 'false');

    const icon = document.createElement('span');
    icon.className = 'nav-toggle-icon';
    icon.textContent = '☰';

    toggleButton.appendChild(icon);
    navbarContent.appendChild(toggleButton);
  }

  const closeMenu = () => {
    navbar.classList.remove('nav-open');
    toggleButton.setAttribute('aria-expanded', 'false');
  };

  toggleButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = navbar.classList.toggle('nav-open');
    toggleButton.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', (event) => {
    if (!navbar.contains(event.target)) {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 480) {
      closeMenu();
    }
  });
}

function ensureNavbarCtas(navLinks) {
  const ensureLink = (selector, href, text, className) => {
    let link = navLinks.querySelector(selector);
    if (!link) {
      link = document.createElement('a');
      link.href = href;
      link.textContent = text;
    }

    link.className = className;
    link.href = href;
    link.textContent = text;
    return link;
  };

  const checkSymptomsLink = ensureLink(
    'a.nav-cta-check',
    'symptom-checker.html',
    '🩺 Check Symptoms',
    'btn-secondary nav-cta nav-cta-check'
  );

  const bookNowLink = ensureLink(
    'a.nav-cta-book',
    'booking.html',
    '📅 Book Now',
    'btn-primary nav-cta nav-cta-book'
  );

  const insertionTarget =
    navLinks.querySelector('a[href="login.html"]') ||
    navLinks.querySelector('a[href="profile.html"], a[href="doctor-dashboard.html"], a[href="admin-dashboard.html"], a[href="logout.html"]');

  if (insertionTarget) {
    navLinks.insertBefore(checkSymptomsLink, insertionTarget);
    navLinks.insertBefore(bookNowLink, insertionTarget);
  } else {
    navLinks.appendChild(checkSymptomsLink);
    navLinks.appendChild(bookNowLink);
  }
}

async function initializeFooterContactInfo() {
  const footerContact = document.querySelector('.footer .footer-contact');
  if (!footerContact) return;

  // Keep email and instagram static, replace phone and address from first branch.
  const defaultPhone = '+1 (215) 555-0100';
  const defaultAddress = 'Philadelphia, PA';

  let phone = defaultPhone;
  let address = defaultAddress;

  try {
    const response = await fetch(`${API_BASE}/branches.php`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      const firstBranch = Array.isArray(data) ? data[0] : data?.data?.[0];

      if (firstBranch) {
        phone = firstBranch.phone || firstBranch.phone_number || defaultPhone;
        address = firstBranch.address || firstBranch.location || defaultAddress;
      }
    }
  } catch (error) {
    console.warn('Unable to load branch contact info for footer:', error);
  }

  footerContact.innerHTML = `
    <li><span class="footer-contact-icon">📞</span><span>${escapeHtml(phone)}</span></li>
    <li><span class="footer-contact-icon">📧</span><span>hello@checkmeup.com</span></li>
    <li><span class="footer-contact-icon">📍</span><span>${escapeHtml(address)}</span></li>
    <li><span class="footer-contact-icon">📸</span><span>@checkmeup</span></li>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
