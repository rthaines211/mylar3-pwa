/**
 * Mylar3 PWA Configuration Manager
 * Handles user configuration for connecting to their Mylar3 instance
 */

class MylarConfig {
  // Get the full database URL (for direct SQL.js access)
  getDatabaseUrl() {
    // Check if configuration was cleared - if so, return null to prevent database loading
    if (localStorage.getItem('configurationCleared') === 'true') {
      console.log('DEBUG: Configuration cleared, getDatabaseUrl returning null');
      return null;
    }
    
    const timestamp = Date.now();
    // Use user config if available
    if (this.config.serverUrl) {
      try {
        const url = new URL(this.config.serverUrl);
        // Assume CORS server is on port 8002
        return `${url.protocol}//${url.hostname}:8002/mylar.db?v=${timestamp}`;
      } catch (error) {
        console.warn('Invalid server URL, falling back to default database URL');
      }
    }
    
    // Only use default if we have a valid server URL configured
    const serverUrl = localStorage.getItem('mylarServerUrl');
    if (!serverUrl) {
      console.log('DEBUG: No server URL configured, getDatabaseUrl returning null');
      return null;
    }
    
    // Default: current hostname, port 8002
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8002/mylar.db?v=${timestamp}`;
  }
  constructor() {
    this.config = this.getDefaultConfig();
    this.loadConfiguration();
    this.setupEventListeners();
  }

  getDefaultConfig() {
    return {
      // No hardcoded defaults - require user configuration
      defaultServerUrl: '',
      defaultApiKey: '',
      defaultComicvineKey: ''
    };
  }

  loadConfiguration() {
    this.config = {
      ...this.getDefaultConfig(),
      serverUrl: localStorage.getItem('mylarServerUrl') || '',
      apiKey: localStorage.getItem('mylarApiKey') || '',
      comicvineApiKey: localStorage.getItem('comicvineApiKey') || ''
    };
    console.log('Configuration loaded:', {
      serverUrl: this.config.serverUrl ? '***' : 'Not set',
      hasApiKey: !!this.config.apiKey,
      hasComicvineKey: !!this.config.comicvineApiKey
    });
    return this.config;
  }

  setupEventListeners() {
    // Listen for configuration updates from settings page
    window.addEventListener('configurationUpdated', (event) => {
      console.log('Configuration updated:', event.detail);
      this.loadConfiguration();
      // Dispatch an event that the config was reloaded
      window.dispatchEvent(new CustomEvent('configurationReloaded', {
        detail: this.config
      }));
    });
  }

  // Get the API URL based on current configuration or fallback
  getApiUrl() {
    // Check if configuration was cleared - if so, return null to prevent API calls
    if (localStorage.getItem('configurationCleared') === 'true') {
      console.log('DEBUG: Configuration cleared, getApiUrl returning null');
      return null;
    }
    
    const serverUrl = this.config.serverUrl || this.config.defaultServerUrl;
    
    // Only use proxy server if we have a valid server URL configured
    if (!this.config.serverUrl) {
      const configuredUrl = localStorage.getItem('mylarServerUrl');
      if (!configuredUrl) {
        console.log('DEBUG: No server URL configured, getApiUrl returning null');
        return null;
      }
      // If running on localhost, use the proxy server on port 3000
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `${window.location.protocol}//localhost:3000`;
      }
      // For mobile/remote access, use the mobile server on port 8888 which includes proxy functionality
      return `${window.location.protocol}//${window.location.hostname}:8888`;
    }

    // Return user's configured server URL
    return serverUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  // Get the Mylar3 API key
  getApiKey(allowDefault = false) {
    if (this.config.apiKey) {
      return this.config.apiKey;
    }
    // Only return default API key if explicitly allowed
    return allowDefault ? this.config.defaultApiKey : '';
  }

  // Get the ComicVine API key
  getComicVineApiKey() {
    return this.config.comicvineApiKey || this.config.defaultComicvineKey;
  }

  // Check if user has configured their own instance
  isUserConfigured() {
    return !!(this.config.serverUrl && this.config.apiKey);
  }

  // Get configuration status for display
  getConfigurationStatus() {
    if (this.isUserConfigured()) {
      return {
        status: 'configured',
        message: 'Using your Mylar3 instance',
        serverUrl: this.config.serverUrl
      };
    } else {
      return {
        status: 'default',
        message: 'Using default configuration',
        serverUrl: this.getApiUrl()
      };
    }
  }

  // Build a complete API URL for Mylar3 requests
  buildApiUrl(command, params = {}) {
    // Check if configuration was cleared - if so, return null to prevent API calls
    if (localStorage.getItem('configurationCleared') === 'true') {
      console.log('DEBUG: Configuration cleared, buildApiUrl returning null');
      return null;
    }

    // Always use the current host for the proxy server (mobile_server.py on port 8888)
    const proxyBaseUrl = `${window.location.protocol}//${window.location.hostname}:8888/proxy`;
    
    // Create URL for the proxy endpoint
    const url = new URL(`${proxyBaseUrl}/api/mylar`);
    
    // Only include API key if one is configured
    const apiKey = this.getApiKey();
    if (apiKey) {
      url.searchParams.set('apikey', apiKey);
    } else {
      console.log('DEBUG: No API key configured, making unauthenticated request');
    }
    
    // Add the command
    url.searchParams.set('cmd', command);
    
    // Add additional parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
    
    console.log('Built API URL:', url.toString().replace(/apikey=[^&]*/, 'apikey=***'));
    return url.toString();
  }

  // Get CORS server URL (for database access)
  getCorsServerUrl() {
    if (this.config.serverUrl) {
      // User has configured their own server - derive CORS server URL
      try {
        const url = new URL(this.config.serverUrl);
        // Assume CORS server is on port 8002 (same as default setup)
        return `${url.protocol}//${url.hostname}:8002`;
      } catch (error) {
        console.warn('Invalid server URL, falling back to default CORS server');
      }
    }
    
    // Default behavior - use current hostname with CORS server port
    // The CORS server is bound to 0.0.0.0:8002 so it's accessible from any network interface
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // Special handling: if accessing via network IP, ensure we use the same IP for CORS server
    // This avoids browser security restrictions on mixed localhost/network requests
    return `${protocol}//${hostname}:8002`;
  }

  // Show configuration prompt if not configured
  showConfigurationPrompt() {
    if (!this.isUserConfigured()) {
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 transform transition-transform duration-300 text-sm';
      toast.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-semibold mb-1">Configure Your Mylar3 Instance</div>
            <div class="text-sm opacity-90">Currently using default settings. Configure your own Mylar3 server in Settings for full functionality.</div>
            <div class="mt-2">
              <a href="settings.html" class="text-yellow-200 hover:text-yellow-100 underline text-sm">Go to Settings</a>
            </div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-300 text-lg leading-none ml-2">&times;</button>
        </div>
      `;
      toast.style.transform = 'translateY(-100px)';
      
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.transform = 'translateY(0)';
      }, 100);
      
      // Auto-remove after 8 seconds
      setTimeout(() => {
        if (document.body.contains(toast)) {
          toast.style.transform = 'translateY(-100px)';
          setTimeout(() => {
            if (document.body.contains(toast)) {
              document.body.removeChild(toast);
            }
          }, 300);
        }
      }, 8000);
    }
  }

  // Export configuration for backup/sharing
  exportConfiguration() {
    return {
      serverUrl: this.config.serverUrl,
      // Don't export API keys for security
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  // Import configuration (excluding API keys for security)
  importConfiguration(configData) {
    if (configData.serverUrl) {
      localStorage.setItem('mylarServerUrl', configData.serverUrl);
      this.config.serverUrl = configData.serverUrl;
      
      // Trigger configuration update event
      window.dispatchEvent(new CustomEvent('configurationUpdated', {
        detail: { serverUrl: configData.serverUrl }
      }));
      
      return true;
    }
    return false;
  }
}

// Create global instance
window.mylarConfig = new MylarConfig();

// Expose utility functions globally
window.getMylarConfig = () => window.mylarConfig.config;
window.buildMylarApiUrl = (command, params) => window.mylarConfig.buildApiUrl(command, params);
window.getMylarApiUrl = () => window.mylarConfig.getApiUrl();
window.getMylarApiKey = () => window.mylarConfig.getApiKey();
window.getComicVineApiKey = () => window.mylarConfig.getComicVineApiKey();
