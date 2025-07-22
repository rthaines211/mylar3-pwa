// Mylar3 PWA Service Worker
// Handles caching, offline mode, background sync, and push notifications

// Check if we're in a secure context
if (!self.isSecureContext) {
  console.warn('Service Worker: Not in secure context - limited functionality');
}

const CACHE_NAME = 'mylar3-pwa-v3';
const DB_CACHE_NAME = 'mylar3-db-v3';
const STATIC_CACHE_NAME = 'mylar3-static-v3';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/details.html',
  '/wanted.html',
  '/Pull-list.html',
  '/history.html',
  '/wanted-details.html',
  '/manifest.json',
  '/pwa-utils.js',
  '/icon-192.svg',
  '/icon-512.svg',
  '/lib/sql-wasm.js',
  '/lib/sql-wasm.wasm'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/mylar\?cmd=getIndex/,
  /\/api\/mylar\?cmd=getWanted/,
  /\/api\/mylar\?cmd=getPullList/,
  /\/api\/mylar\?cmd=getHistory/
];

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES.filter(url => !url.startsWith('http')));
      }),
      // Cache external resources
      caches.open(CACHE_NAME).then(cache => {
        console.log('Service Worker: Caching external resources');
        return Promise.all(
          STATIC_FILES.filter(url => url.startsWith('http')).map(url => 
            cache.add(url).catch(err => console.warn('Failed to cache:', url, err))
          )
        );
      })
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== DB_CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      self.clients.claim();
    })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', event => {
  // Only handle HTTP/HTTPS requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  const request = event.request;
  const url = new URL(request.url);

  // Only handle requests to the same origin (our PWA files)
  // Let external API calls (like Mylar3 server) pass through without interference
  if (url.origin !== self.location.origin) {
    console.log('Service Worker: Allowing external request to pass through:', url.href);
    return; // Don't intercept external requests
  }

  console.log('Service Worker: Handling same-origin request:', url.href);

  // Database file requests - let them pass through to avoid CORS issues
  // The CORS server handles database requests properly
  if (url.pathname.includes('mylar.db')) {
    console.log('Service Worker: Allowing database request to pass through to CORS server');
    return; // Don't intercept database requests
  }

  // API requests - network first with cache fallback
  if (url.pathname.includes('/api/mylar') || API_CACHE_PATTERNS.some(pattern => pattern.test(url.href))) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Static files - cache first
  if (STATIC_FILES.some(file => url.pathname === file || url.pathname.endsWith(file))) {
    event.respondWith(cacheFirstWithUpdate(request, STATIC_CACHE_NAME));
    return;
  }

  // HTML pages - network first with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Everything else - network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Caching strategies
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return new Response(getOfflinePage(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    throw error;
  }
}

async function cacheFirstWithUpdate(request, cacheName = CACHE_NAME) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    updateCache(request, cacheName);
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Failed to fetch:', request.url, error);
    throw error;
  }
}

async function updateCache(request, cacheName = CACHE_NAME) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response);
    }
  } catch (error) {
    console.log('Background cache update failed:', error);
  }
}

// Background Sync for offline actions
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-comic-actions') {
    event.waitUntil(syncComicActions());
  } else if (event.tag === 'background-sync-pull-list') {
    event.waitUntil(checkForNewPullList());
  } else if (event.tag === 'background-sync-wanted-issues') {
    event.waitUntil(checkForWantedIssues());
  }
});

// Push notification handling
self.addEventListener('push', event => {
  console.log('Push notification received:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Mylar3', body: event.data.text() };
    }
  }

  const options = {
    title: data.title || 'Mylar3',
    body: data.body || 'New update available',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'mylar3-notification',
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    const data = event.notification.data;
    let url = '/';
    
    if (data.type === 'pull-list') {
      url = '/Pull-list.html';
    } else if (data.type === 'wanted' && data.comicId) {
      url = `/wanted-details.html?id=${data.comicId}`;
    } else if (data.type === 'comic' && data.comicId) {
      url = `/details.html?id=${data.comicId}`;
    }
    
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

// Sync comic actions when back online
async function syncComicActions() {
  try {
    console.log('Syncing comic actions...');
    const actions = await getStoredActions();
    
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      console.log('No actions to sync');
      return;
    }

    for (const action of actions) {
      try {
        await performAction(action);
        // Remove successful action
        await removeStoredAction(action.id);
        console.log('Synced action:', action.type);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Check for new pull list items
async function checkForNewPullList() {
  try {
    const response = await fetch('/api/mylar?cmd=getPullList&apikey=274fb029315c3937d613c7272630f08c');
    if (response.ok) {
      const data = await response.json();
      const newItems = data.issues || [];
      
      // Check if there are new items since last check
      const lastCheck = await getLastPullListCheck();
      const newItemsCount = newItems.filter(item => 
        new Date(item.DateAdded) > lastCheck
      ).length;
      
      if (newItemsCount > 0) {
        await self.registration.showNotification('New Pull List Items', {
          body: `${newItemsCount} new item(s) added to your pull list`,
          icon: '/icon-192.svg',
          tag: 'pull-list-update',
          data: { type: 'pull-list' }
        });
      }
      
      await setLastPullListCheck(new Date());
    }
  } catch (error) {
    console.error('Failed to check pull list:', error);
  }
}

// Check for wanted issues that are now available
async function checkForWantedIssues() {
  try {
    const response = await fetch('/api/mylar?cmd=getWanted&apikey=274fb029315c3937d613c7272630f08c');
    if (response.ok) {
      const data = await response.json();
      const wantedItems = data.issues || [];
      
      // Check for newly available issues
      const lastCheck = await getLastWantedCheck();
      const newlyAvailable = wantedItems.filter(item => 
        item.Status === 'Downloaded' && new Date(item.DateAdded) > lastCheck
      );
      
      for (const item of newlyAvailable) {
        await self.registration.showNotification('Wanted Issue Available', {
          body: `${item.ComicName} #${item.Issue_Number} is now available`,
          icon: '/icon-192.png',
          tag: `wanted-${item.IssueID}`,
          data: { 
            type: 'wanted', 
            comicId: item.ComicID,
            issueId: item.IssueID 
          }
        });
      }
      
      await setLastWantedCheck(new Date());
    }
  } catch (error) {
    console.error('Failed to check wanted issues:', error);
  }
}

// Helper functions for IndexedDB storage
function openDB(name, version) {
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

async function getLastPullListCheck() {
  try {
    const db = await openDB('mylar3-offline-actions', 1);
    const tx = db.transaction(['settings'], 'readonly');
    const result = await tx.objectStore('settings').get('lastPullListCheck');
    return result?.value ? new Date(result.value) : new Date(0);
  } catch {
    return new Date(0);
  }
}

async function setLastPullListCheck(date) {
  try {
    const db = await openDB('mylar3-offline-actions', 1);
    const tx = db.transaction(['settings'], 'readwrite');
    await tx.objectStore('settings').put({ key: 'lastPullListCheck', value: date.toISOString() });
  } catch (error) {
    console.error('Failed to save last pull list check:', error);
  }
}

async function getLastWantedCheck() {
  try {
    const db = await openDB('mylar3-offline-actions', 1);
    const tx = db.transaction(['settings'], 'readonly');
    const result = await tx.objectStore('settings').get('lastWantedCheck');
    return result?.value ? new Date(result.value) : new Date(0);
  } catch {
    return new Date(0);
  }
}

async function setLastWantedCheck(date) {
  try {
    const db = await openDB('mylar3-offline-actions', 1);
    const tx = db.transaction(['settings'], 'readwrite');
    await tx.objectStore('settings').put({ key: 'lastWantedCheck', value: date.toISOString() });
  } catch (error) {
    console.error('Failed to save last wanted check:', error);
  }
}

// Helper functions for IndexedDB storage of offline actions
async function getStoredActions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mylar3-sync', 1);
    
    request.onerror = () => resolve([]); // Return empty array on error
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('actions')) {
        resolve([]);
        return;
      }
      
      const transaction = db.transaction(['actions'], 'readonly');
      const store = transaction.objectStore('actions');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
      getAllRequest.onerror = () => resolve([]); // Return empty array on error
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('actions')) {
        db.createObjectStore('actions', { keyPath: 'id' });
      }
    };
  });
}

async function removeStoredAction(actionId) {
  return new Promise((resolve) => {
    const request = indexedDB.open('mylar3-sync', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('actions')) {
        resolve();
        return;
      }
      
      const transaction = db.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      const deleteRequest = store.delete(actionId);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve(); // Resolve even on error
    };
    
    request.onerror = () => resolve(); // Resolve even on error
  });
}

async function performAction(action) {
  const response = await fetch(action.url, {
    method: action.method || 'GET',
    headers: action.headers || {},
    body: action.body || null
  });
  
  if (!response.ok) {
    throw new Error(`Action failed: ${response.status}`);
  }
  
  return response;
}

// Offline page HTML
function getOfflinePage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
      <title>Offline - Mylar3</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-[#1F1F1F] text-[#ECECEC] min-h-screen flex items-center justify-center">
      <div class="text-center p-8">
        <div class="mb-6">
          <svg class="h-16 w-16 text-[#CCAF45] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12c0 4.971-4.029 9-9 9s-9-4.029-9-9 4.029-9 9-9 9 4.029 9 9z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold mb-4">You're Offline</h1>
        <p class="text-[#CCCCCC] mb-6">Some features may not be available while offline.</p>
        <button onclick="window.location.reload()" class="bg-[#CCAF45] text-[#1F1F1F] px-6 py-3 rounded-lg font-semibold hover:bg-[#B8A040] transition-colors">
          Try Again
        </button>
      </div>
    </body>
    </html>
  `;
}

console.log('Service Worker: Loaded');
