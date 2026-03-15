document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.toLowerCase();
  const isMainPage = currentPath.endsWith('/frontend/pages/index.html') || currentPath.endsWith('/pages/index.html') || currentPath.endsWith('/index.html');

  if (isMainPage) {
    return;
  }

  if (document.querySelector('.back-home-btn')) {
    return;
  }

  const backLink = document.createElement('a');
  backLink.href = 'index.html';
  backLink.className = 'back-home-btn';
  backLink.setAttribute('aria-label', 'Go back to main page');
  backLink.textContent = 'Back to Main Page';

  document.body.appendChild(backLink);
});
