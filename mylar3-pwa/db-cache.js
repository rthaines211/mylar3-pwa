/**
 * Database Cache Manager for Mylar3 PWA
 * Handles intelligent caching, ETag checking, and progressive loading
 */

class DatabaseCache {
  constructor() {
    this.dbName = 'mylar3-cache';
    this.version = 1;
    this.database = null;
    this.sqlJsReady = false;
  }

  /**
   * Initialize IndexedDB for caching
   */
  async initCache() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store for database cache
        if (!db.objectStoreNames.contains('database')) {
          const store = db.createObjectStore('database', { keyPath: 'id' });
          store.createIndex('etag', 'etag', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Get cached database info
   */
  async getCachedInfo() {
    try {
      const cache = await this.initCache();
      const transaction = cache.transaction(['database'], 'readonly');
      const store = transaction.objectStore('database');
      
      return new Promise((resolve, reject) => {
        const request = store.get('current');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Cache access failed:', error);
      return null;
    }
  }

  /**
   * Store database in cache
   */
  async storeInCache(arrayBuffer, etag) {
    try {
      const cache = await this.initCache();
      const transaction = cache.transaction(['database'], 'readwrite');
      const store = transaction.objectStore('database');
      
      const data = {
        id: 'current',
        arrayBuffer: arrayBuffer,
        etag: etag,
        timestamp: Date.now()
      };
      
      return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Cache storage failed:', error);
    }
  }

  /**
   * Check if database has changed using ETag
   */
  async checkDatabaseVersion(url) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        return response.headers.get('ETag');
      }
    } catch (error) {
      console.warn('ETag check failed:', error);
    }
    return null;
  }

  /**
   * Load database with progressive enhancement
   */
  async loadDatabase() {
    try {
      // Initialize SQL.js if not already done
      if (!window.SQL) {
        if (typeof window.initSqlJs === 'undefined') {
          throw new Error('SQL.js library is not available');
        }
        
        window.SQL = await window.initSqlJs({
          locateFile: file => `./lib/${file}`
        });
      }
      
      // First, try to load from cache for immediate display
      const cachedInfo = await this.getCachedInfo();
      let hasCachedData = false;
      
      if (cachedInfo && cachedInfo.arrayBuffer) {
        console.log('Loading from cache...');
        this.database = new window.SQL.Database(new Uint8Array(cachedInfo.arrayBuffer));
        this.sqlJsReady = true;
        hasCachedData = true;
        
        // Notify that cached data is ready
        if (window.onCachedDataReady) {
          window.onCachedDataReady();
        }
      }

      // Get database endpoint from config (respects user settings)
      const endpoint = window.mylarConfig && typeof window.mylarConfig.getDatabaseUrl === 'function'
        ? window.mylarConfig.getDatabaseUrl()
        : (typeof mylarConfig !== 'undefined' && typeof mylarConfig.getDatabaseUrl === 'function' ? mylarConfig.getDatabaseUrl() : `${window.location.protocol}//${window.location.hostname}:8002/mylar.db?v=${Date.now()}`);
      const endpoints = [endpoint];

      // Check if database has changed
      let currentEtag = null;
      for (const endpoint of endpoints) {
        currentEtag = await this.checkDatabaseVersion(endpoint);
        if (currentEtag) break;
      }

      // If we have cached data and ETag matches, we're done
      if (hasCachedData && cachedInfo.etag === currentEtag) {
        console.log('Database is up to date');
        return this.database;
      }

      // Download fresh database
      console.log(hasCachedData ? 'Updating database...' : 'Loading database...');
      
      let response = null;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          response = await fetch(endpoint, {
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          if (response.ok) {
            console.log(`Successfully fetched database from: ${endpoint}`);
            break;
          }
          lastError = `${endpoint}: ${response.status} ${response.statusText}`;
        } catch (err) {
          lastError = `${endpoint}: ${err.message}`;
        }
      }

      if (!response || !response.ok) {
        if (hasCachedData) {
          console.warn('Failed to update database, using cached version');
          return this.database;
        }
        throw new Error(`Failed to fetch database from any endpoint. Last error: ${lastError}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const newEtag = response.headers.get('ETag') || currentEtag;
      
      // Store in cache
      await this.storeInCache(arrayBuffer, newEtag);
      
      // Update current database
      this.database = new window.SQL.Database(new Uint8Array(arrayBuffer));
      this.sqlJsReady = true;
      
      // Notify that fresh data is ready
      if (window.onFreshDataReady) {
        window.onFreshDataReady();
      }
      
      return this.database;
      
    } catch (error) {
      console.error('Database loading failed:', error);
      throw error;
    }
  }

  /**
   * Clear cache (for debugging or reset)
   */
  async clearCache() {
    try {
      const cache = await this.initCache();
      const transaction = cache.transaction(['database'], 'readwrite');
      const store = transaction.objectStore('database');
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  }

  /**
   * Get cache size for debugging
   */
  async getCacheSize() {
    try {
      const cachedInfo = await this.getCachedInfo();
      if (cachedInfo && cachedInfo.arrayBuffer) {
        return cachedInfo.arrayBuffer.byteLength;
      }
    } catch (error) {
      console.warn('Cache size check failed:', error);
    }
    return 0;
  }
}

// Global instance
window.dbCache = new DatabaseCache();
