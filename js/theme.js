// js/theme.js

const THEME_KEY = 'portfolio_theme';

/**
 * Initializes theme based on localStorage or system preference
 */
export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }

  // Setup toggle button listeners across pages
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });
}

/**
 * Sets theme on <html> element
 * @param {'light'|'dark'} theme 
 */
export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  updateToggleIcons(theme);
}

/**
 * Toggles between light and dark
 */
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
}

/**
 * Updates icon on theme button
 * @param {'light'|'dark'} theme 
 */
function updateToggleIcons(theme) {
  const buttons = document.querySelectorAll('.theme-toggle-btn');
  buttons.forEach(btn => {
    if (theme === 'dark') {
      btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
      btn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      btn.setAttribute('aria-label', 'Switch to dark mode');
    }
  });
}
