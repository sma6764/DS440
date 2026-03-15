// Navbar.js - Dynamic navbar authentication state

document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuthState();
  initializeNavbarMenu();
});

function updateNavbarAuthState() {
  // Check if user is logged in from localStorage
  const userDataStr = localStorage.getItem('checkmeup_user');
  const role = localStorage.getItem('checkmeup_role');
  
  // Find the navbar container (different pages have different structures)
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  
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
      greeting.style.color = 'var(--color-text-muted, #6B7280)';
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
      logoutLink.style.color = 'var(--color-error, #ef4444)';
      
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
