// PWA utilities for service worker, push notifications, and offline functionality
class MylarPWA {
  constructor() {
    this.swRegistration = null;
    this.apiKey = '274fb029315c3937d613c7272630f08c';
    this.isOnline = navigator.onLine;
    
    this.init();
  }

  async init() {
    // Check if we're in a secure context (HTTPS or localhost)
    const isSecureContext = window.isSecureContext || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';
    
    // Register service worker if supported and in secure context
    if ('serviceWorker' in navigator) {
      if (isSecureContext) {
        try {
          this.swRegistration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered:', this.swRegistration);
          
          // Update on service worker updates
          this.swRegistration.addEventListener('updatefound', () => {
            const newWorker = this.swRegistration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateAvailableMessage();
              }
            });
          });
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      } else {
        console.warn('Service Workers require HTTPS. Use https://localhost:8889 for full PWA features on mobile devices.');
        // Show a message to the user about HTTPS requirement
        this.showHttpsRequiredMessage();
      }
    }

    // Set up push notifications (only if service worker is available)
    if (this.swRegistration) {
      this.setupPushNotifications();
    }
    
    // Set up background sync (only if service worker is available)
    if (this.swRegistration) {
      this.setupBackgroundSync();
    }
    
    // Monitor online/offline status (works without service worker)
    this.setupOfflineHandling();
    
    // Schedule periodic checks (works without service worker)
    this.schedulePeriodicSync();
  }

  async setupPushNotifications() {
    if (!('Notification' in window) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    // Request notification permission
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return;
      }
    }

    if (Notification.permission === 'granted' && this.swRegistration) {
      try {
        // Subscribe to push notifications
        const subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.getVAPIDKey())
        });
        
        console.log('Push subscription:', subscription);
        
        // Send subscription to server (you'll need to implement this endpoint)
        await this.sendSubscriptionToServer(subscription);
      } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
      }
    }
  }

  async setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      // Register background sync for different events
      try {
        await this.swRegistration.sync.register('background-sync-comic-actions');
        await this.swRegistration.sync.register('background-sync-pull-list');
        await this.swRegistration.sync.register('background-sync-wanted-issues');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  setupOfflineHandling() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showMessage('Back online! Syncing data...', 'success');
      this.syncOfflineActions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showMessage('You\'re offline. Some features may be limited.', 'info');
    });

    // Add offline indicator to UI
    this.updateOnlineStatus();
  }

  schedulePeriodicSync() {
    // Check for updates every 15 minutes when online
    setInterval(() => {
      if (this.isOnline && this.swRegistration) {
        this.swRegistration.sync.register('background-sync-pull-list');
        this.swRegistration.sync.register('background-sync-wanted-issues');
      }
    }, 15 * 60 * 1000); // 15 minutes
  }

  // Queue actions for when offline
  async queueOfflineAction(action) {
    try {
      const db = await this.openDB('mylar3-offline-actions', 1);
      const tx = db.transaction(['actions'], 'readwrite');
      await tx.objectStore('actions').add({
        ...action,
        timestamp: new Date().toISOString(),
        apikey: this.apiKey
      });
      console.log('Action queued for offline sync:', action);
    } catch (error) {
      console.error('Failed to queue offline action:', error);
      throw error;
    }
  }

  // Enhanced action methods with offline support
  async pauseComic(comicId) {
    const action = { type: 'pauseComic', comicId };
    
    if (this.isOnline) {
      try {
        const response = await fetch(`${this.getApiUrl()}/api/mylar?cmd=pauseComic&apikey=${this.apiKey}&id=${comicId}`);
        if (!response.ok) throw new Error('Network request failed');
        return response;
      } catch (error) {
        await this.queueOfflineAction(action);
        throw error;
      }
    } else {
      await this.queueOfflineAction(action);
      this.showMessage('Action queued for when you\'re back online', 'info');
    }
  }

  async resumeComic(comicId) {
    const action = { type: 'resumeComic', comicId };
    
    if (this.isOnline) {
      try {
        const response = await fetch(`${this.getApiUrl()}/api/mylar?cmd=resumeComic&apikey=${this.apiKey}&id=${comicId}`);
        if (!response.ok) throw new Error('Network request failed');
        return response;
      } catch (error) {
        await this.queueOfflineAction(action);
        throw error;
      }
    } else {
      await this.queueOfflineAction(action);
      this.showMessage('Action queued for when you\'re back online', 'info');
    }
  }

  async deleteComic(comicId) {
    const action = { type: 'delComic', comicId };
    
    if (this.isOnline) {
      try {
        const response = await fetch(`${this.getApiUrl()}/api/mylar?cmd=delComic&apikey=${this.apiKey}&id=${comicId}`);
        if (!response.ok) throw new Error('Network request failed');
        return response;
      } catch (error) {
        await this.queueOfflineAction(action);
        throw error;
      }
    } else {
      await this.queueOfflineAction(action);
      this.showMessage('Action queued for when you\'re back online', 'info');
    }
  }

  async syncOfflineActions() {
    if (this.swRegistration && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await this.swRegistration.sync.register('background-sync-comic-actions');
      } catch (error) {
        console.error('Failed to trigger background sync:', error);
      }
    }
  }

  updateOnlineStatus() {
    // Add online/offline indicator to all pages
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = `fixed top-2 right-2 z-50 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
      this.isOnline 
        ? 'bg-green-600 text-white' 
        : 'bg-red-600 text-white'
    }`;
    indicator.textContent = this.isOnline ? 'Online' : 'Offline';
    indicator.style.display = this.isOnline ? 'none' : 'block';
    
    // Check if body exists before appending
    if (document.body) {
      document.body.appendChild(indicator);
    } else {
      // If body doesn't exist, wait for it
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
          document.body.appendChild(indicator);
        }
      });
    }

    // Update indicator when status changes
    window.addEventListener('online', () => {
      if (indicator) {
        indicator.className = indicator.className.replace('bg-red-600', 'bg-green-600');
        indicator.textContent = 'Online';
        setTimeout(() => {
          if (indicator) indicator.style.display = 'none';
        }, 3000);
      }
    });

    window.addEventListener('offline', () => {
      if (indicator) {
        indicator.className = indicator.className.replace('bg-green-600', 'bg-red-600');
        indicator.textContent = 'Offline';
        indicator.style.display = 'block';
      }
    });
  }

  showUpdateAvailableMessage() {
    const updateBanner = document.createElement('div');
    updateBanner.className = 'fixed bottom-20 left-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg';
    updateBanner.innerHTML = `
      <div class="flex items-center justify-between">
        <span>App update available!</span>
        <button onclick="window.location.reload()" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium">
          Update
        </button>
      </div>
    `;
    document.body.appendChild(updateBanner);
  }

  showHttpsRequiredMessage() {
    // Create a notification about HTTPS requirement
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #5A5A2D;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 90%;
      text-align: center;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">⚠️ Limited PWA Features</div>
      <div>Service Workers require HTTPS for full offline support and push notifications.</div>
      <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">
        Use https://localhost:8889 for full PWA features
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  }

  // Utility methods
  getApiUrl() {
    // Use port 3000 for the proxy server
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }

  openDB(name, version) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('actions')) {
          db.createObjectStore('actions', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  getVAPIDKey() {
    // You'll need to generate your own VAPID keys for production
    // This is a placeholder - replace with your actual VAPID public key
    return 'BEl62iUYgUivxIkv69yViEuiBIa40HI0DLLsWlQ1WGhzgFGK7aTrHPyZL9fZpXw9JgmBJIZT3m2NlJgPmvgCgIM';
  }

  async sendSubscriptionToServer(subscription) {
    // This would send the subscription to your server
    // For now, just log it - you'll need to implement the server endpoint
    console.log('Push subscription to send to server:', JSON.stringify(subscription));
    
    // Example implementation (you'll need to create this endpoint):
    /*
    try {
      await fetch(`${this.getApiUrl()}/api/push-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
    */
  }

  showMessage(message, type = 'info') {
    // Remove existing message if any
    const existingMessage = document.getElementById('tempMessage');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.id = 'tempMessage';
    messageDiv.className = `fixed top-20 left-4 right-4 z-50 p-4 rounded-lg font-medium text-center ${
      type === 'success' ? 'bg-green-600 text-white' : 
      type === 'error' ? 'bg-red-600 text-white' : 
      'bg-blue-600 text-white'
    }`;
    messageDiv.textContent = message;
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (messageDiv && messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 3000);
  }
}

// Initialize PWA functionality when DOM is ready
function initMylarPWA() {
  // Extra safety check - make sure document and body exist
  if (typeof document === 'undefined' || !document.body) {
    console.log('DOM not ready for PWA init, waiting...');
    setTimeout(initMylarPWA, 100);
    return;
  }
  
  if (typeof window.mylarPWA === 'undefined') {
    try {
      window.mylarPWA = new MylarPWA();
    } catch (error) {
      console.warn('PWA initialization failed:', error);
      // Retry after a delay
      setTimeout(() => {
        try {
          window.mylarPWA = new MylarPWA();
        } catch (retryError) {
          console.error('PWA initialization failed on retry:', retryError);
        }
      }, 1000);
    }
  }
}

// Check if DOM is already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMylarPWA);
} else if (document.readyState === 'interactive' || document.readyState === 'complete') {
  // DOM is ready, but add small delay to ensure body exists
  setTimeout(initMylarPWA, 50);
} else {
  // Fallback
  initMylarPWA();
}
