/**
 * Lazy Loading Manager for Mylar3 PWA
 * Improves performance by loading images only when they're visible
 */

class LazyLoader {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    // Check if Intersection Observer is supported
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      }, {
        // Load images when they're 100px away from viewport
        rootMargin: '100px'
      });
    }
  }

  /**
   * Load an image element
   */
  loadImage(img) {
    const src = img.dataset.src || img.dataset.lazySrc;
    if (src) {
      // Create a new image to preload
      const imageLoader = new Image();
      
      imageLoader.onload = () => {
        // Image loaded successfully, update the img element
        img.src = src;
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-loaded');
        
        // Remove data attributes
        delete img.dataset.src;
        delete img.dataset.lazySrc;
      };
      
      imageLoader.onerror = () => {
        // Image failed to load, show placeholder or default
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-error');
        
        // Set a default/placeholder image
        img.src = this.getPlaceholderImage();
      };
      
      // Start loading
      imageLoader.src = src;
    }
  }

  /**
   * Generate a placeholder image (SVG data URL)
   */
  getPlaceholderImage() {
    return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300' fill='%23333'><rect width='200' height='300' fill='%23333'/><text x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-family='sans-serif' font-size='14'>No Image</text></svg>`;
  }

  /**
   * Setup lazy loading for an image element
   */
  observe(img) {
    if (!img.dataset.src && !img.dataset.lazySrc) {
      return; // No lazy source specified
    }

    // Add loading class
    img.classList.add('lazy-loading');
    
    // Set placeholder while loading
    if (!img.src || img.src === '') {
      img.src = this.getPlaceholderImage();
    }

    if (this.observer) {
      this.observer.observe(img);
    } else {
      // Fallback for browsers without Intersection Observer
      this.loadImage(img);
    }
  }

  /**
   * Setup lazy loading for multiple images
   */
  observeAll(selector = '[data-src], [data-lazy-src]') {
    const images = document.querySelectorAll(selector);
    images.forEach(img => this.observe(img));
  }

  /**
   * Preload critical images (above the fold)
   */
  preloadCritical(selector = '.critical-image') {
    const images = document.querySelectorAll(selector);
    images.forEach(img => {
      if (img.dataset.src || img.dataset.lazySrc) {
        this.loadImage(img);
      }
    });
  }

  /**
   * Update lazy loading when content changes
   */
  refresh() {
    this.observeAll();
  }
}

// Initialize lazy loader
window.lazyLoader = new LazyLoader();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.lazyLoader.observeAll();
  });
} else {
  window.lazyLoader.observeAll();
}
