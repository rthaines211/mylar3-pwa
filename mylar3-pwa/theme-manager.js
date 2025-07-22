// Simple Theme Management
class ThemeManager {
  constructor() {
    // Get theme from localStorage or default to dark
    this.currentTheme = localStorage.getItem('theme') || 'dark';
    
    // Validate theme
    if (this.currentTheme !== 'dark' && this.currentTheme !== 'light') {
      this.currentTheme = 'dark';
    }
    
    this.init();
  }

  init() {
    console.log('ThemeManager initializing with theme:', this.currentTheme);
    
    // Apply the current theme
    this.applyTheme(this.currentTheme);
    
    // Setup event listeners immediately if DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupEventListeners();
      });
    } else {
      this.setupEventListeners();
    }
  }

  applyTheme(theme) {
    console.log('Applying theme:', theme);
    
    this.currentTheme = theme;
    localStorage.setItem('theme', theme);
    
    // Apply to document
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (document.body) {
        document.body.style.backgroundColor = '#FFFFFF';
        document.body.style.color = '#000000';
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (document.body) {
        document.body.style.backgroundColor = '#1F1F1F';
        document.body.style.color = '#ECECEC';
      }
    }
    
    // Update the switch UI
    this.updateSwitchUI();
    
    // Dispatch a custom event that other scripts can listen for
    const themeChangedEvent = new CustomEvent('themeChanged', { detail: { theme } });
    window.dispatchEvent(themeChangedEvent);
    
    console.log('Theme applied:', theme);
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    console.log('Toggling from', this.currentTheme, 'to', newTheme);
    this.applyTheme(newTheme);
  }

  setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Find the theme switch
    const themeSwitch = document.getElementById('theme-switch');
    if (themeSwitch) {
      console.log('Theme switch found, adding listener');
      
      // Remove any existing listeners to prevent duplicates
      themeSwitch.removeEventListener('change', this.handleThemeChange);
      
      // Bind the handler so 'this' refers to our class instance
      this.handleThemeChange = this.handleThemeChange.bind(this);
      
      // Add event listener
      themeSwitch.addEventListener('change', this.handleThemeChange);
      
      // Initial UI update
      this.updateSwitchUI();
    } else {
      console.log('No theme switch found');
    }
  }

  handleThemeChange(e) {
    console.log('Switch clicked! Checked:', e.target.checked);
    this.toggleTheme();
  }

  updateSwitchUI() {
    const themeSwitch = document.getElementById('theme-switch');
    if (!themeSwitch) {
      console.log('Theme switch element not found on this page');
      return;
    }
    
    const isLight = this.currentTheme === 'light';
    console.log('Updating switch UI for theme:', this.currentTheme, 'isLight:', isLight);
    
    // Update checkbox
    themeSwitch.checked = isLight;
    
    // Find the slider elements
    const slider = document.querySelector('.theme-toggle-slider');
    const container = slider?.parentElement;
    
    if (slider && container) {
      if (isLight) {
        // Light mode: slider right, light background
        slider.style.transform = 'translateX(22px)'; // Move to the right
        container.style.backgroundColor = '#CCAF45';
        slider.style.backgroundColor = '#1F1F1F';
      } else {
        // Dark mode: slider left, dark background
        slider.style.transform = 'translateX(2px)'; // Move to the left
        container.style.backgroundColor = '#444444';
        slider.style.backgroundColor = '#ECECEC';
      }
    } else {
      console.log('Theme toggle slider elements not found on this page');
    }
  }
}

// Initialize when DOM is ready
function initThemeManager() {
  if (typeof window.themeManager === 'undefined') {
    window.themeManager = new ThemeManager();
  }
}

// Check if DOM is already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeManager);
} else {
  // DOM is already ready
  initThemeManager();
}

// Debug functions
window.debugTheme = function() {
  console.log('=== Theme Debug ===');
  console.log('Current theme:', themeManager.currentTheme);
  console.log('LocalStorage:', localStorage.getItem('theme'));
  console.log('HTML attribute:', document.documentElement.getAttribute('data-theme'));
  console.log('Switch element:', document.getElementById('theme-switch'));
  console.log('Switch checked:', document.getElementById('theme-switch')?.checked);
  console.log('==================');
};

window.testThemeToggle = function() {
  console.log('Manual theme toggle test');
  themeManager.toggleTheme();
};
