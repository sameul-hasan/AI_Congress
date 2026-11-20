/**
 * ClimateSphere AI — Enterprise Unified Theme System
 * Supports Dark (Default / Obsidian Space), Light (Daylight Architectural), and Contrast (WCAG AAA Field Inspection)
 * Synchronizes across Landing, Auth, and Application Console via localStorage and Storage Events
 */

(function () {
  const THEME_KEY = 'climatesphere_theme';
  const VALID_THEMES = ['dark', 'light', 'contrast'];

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved && VALID_THEMES.includes(saved)) return saved;
    } catch (e) {}
    return 'dark';
  }

  function applyTheme(theme) {
    if (!VALID_THEMES.includes(theme)) theme = 'dark';

    // Apply to html attribute
    document.documentElement.setAttribute('data-theme', theme);

    // Apply body classes for CSS compatibility
    if (document.body) {
      document.body.classList.toggle('theme-light', theme === 'light');
      document.body.classList.toggle('theme-contrast', theme === 'contrast');
    }

    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}

    // Update icons and labels on any present theme toggles
    updateThemeToggles(theme);

    // Dispatch custom event for charts or components that need to re-render
    window.dispatchEvent(new CustomEvent('climatesphere:themechange', { detail: { theme } }));
  }

  function cycleTheme() {
    const current = getSavedTheme();
    let next = 'dark';
    if (current === 'dark') next = 'light';
    else if (current === 'light') next = 'contrast';
    else next = 'dark';
    applyTheme(next);
    return next;
  }

  function updateThemeToggles(theme) {
    // 1. Landing Page Toggle
    const landingBtn = document.getElementById('landingThemeToggle');
    const landingIcon = document.getElementById('landingThemeIcon');
    const landingLabel = document.getElementById('landingThemeLabel');
    if (landingBtn && landingIcon) {
      if (theme === 'light') {
        landingIcon.textContent = '🌙';
        if (landingLabel) landingLabel.textContent = 'NIGHT';
        landingBtn.title = 'Switch to High-Contrast Inspection Theme';
      } else if (theme === 'contrast') {
        landingIcon.textContent = '⚡';
        if (landingLabel) landingLabel.textContent = 'HIGH-CONTRAST';
        landingBtn.title = 'Switch to Default Cyber Dark Theme';
      } else {
        landingIcon.textContent = '☀️';
        if (landingLabel) landingLabel.textContent = 'DAY';
        landingBtn.title = 'Switch to Daylight Theme';
      }
    }

    // 2. Mobile Drawer Toggle
    const mobileIcon = document.getElementById('mobileThemeIcon');
    const mobileLabel = document.getElementById('mobileThemeLabel');
    if (mobileIcon && mobileLabel) {
      if (theme === 'light') {
        mobileIcon.textContent = '🌙';
        mobileLabel.textContent = 'Switch to Night Theme';
      } else if (theme === 'contrast') {
        mobileIcon.textContent = '⚡';
        mobileLabel.textContent = 'Switch to Dark Theme';
      } else {
        mobileIcon.textContent = '☀️';
        mobileLabel.textContent = 'Switch to Day Theme';
      }
    }

    // 3. Auth Page Toggle
    const authIcon = document.getElementById('authThemeIcon');
    const authText = document.getElementById('authThemeText');
    const authBtn = document.getElementById('authThemeToggle');
    if (authBtn && authIcon) {
      if (theme === 'light') {
        authIcon.textContent = '🌙';
        if (authText) authText.textContent = 'Night Mode';
        authBtn.title = 'Switch to High-Contrast Theme';
      } else if (theme === 'contrast') {
        authIcon.textContent = '⚡';
        if (authText) authText.textContent = 'High Contrast';
        authBtn.title = 'Switch to Dark Theme';
      } else {
        authIcon.textContent = '☀️';
        if (authText) authText.textContent = 'Day Mode';
        authBtn.title = 'Switch to Day Mode';
      }
    }

    // 4. Main Console Application Topbar & Sidebar Toggles
    const topbarIcon = document.getElementById('themeToggleIcon');
    const topbarLabel = document.getElementById('themeToggleLabel');
    const topbarBtn = document.getElementById('btnThemeToggle');
    if (topbarBtn && topbarIcon) {
      if (theme === 'light') {
        topbarIcon.textContent = '🌙';
        if (topbarLabel) topbarLabel.textContent = 'NIGHT MODE';
        topbarBtn.title = 'Switch to High-Contrast Inspection Theme (WCAG AAA)';
      } else if (theme === 'contrast') {
        topbarIcon.textContent = '⚡';
        if (topbarLabel) topbarLabel.textContent = 'CONTRAST';
        topbarBtn.title = 'Switch to Standard Dark Operations';
      } else {
        topbarIcon.textContent = '☀️';
        if (topbarLabel) topbarLabel.textContent = 'DAY MODE';
        topbarBtn.title = 'Switch to High-Contrast Daylight Mode (WCAG AAA)';
      }
    }

    const sidebarIcon = document.getElementById('sidebarThemeIcon');
    const sidebarText = document.getElementById('sidebarThemeText');
    if (sidebarIcon && sidebarText) {
      if (theme === 'light') {
        sidebarIcon.textContent = '🌙';
        sidebarText.textContent = 'Night Mode';
      } else if (theme === 'contrast') {
        sidebarIcon.textContent = '⚡';
        sidebarText.textContent = 'Contrast Mode';
      } else {
        sidebarIcon.textContent = '☀️';
        sidebarText.textContent = 'Daylight Mode';
      }
    }
  }

  // Cross-tab synchronization
  window.addEventListener('storage', function (e) {
    if (e.key === THEME_KEY && e.newValue) {
      applyTheme(e.newValue);
    }
  });

  // Attach global controllers
  window.ClimateSphereTheme = {
    get: getSavedTheme,
    set: applyTheme,
    cycle: cycleTheme
  };
  window.applyTheme = applyTheme;

  // Immediate initialization
  const initialTheme = getSavedTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyTheme(initialTheme));
  } else {
    applyTheme(initialTheme);
  }
})();
