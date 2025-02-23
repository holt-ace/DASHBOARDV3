import logger from '../utils/logger.js';

/**
 * Simple in-memory cache service following the documented patterns.
 * Provides clean caching with TTL and efficient updates.
 */
class CacheService {
    constructor() {
        this.cache = new Map();
        this.config = {
            defaultTTL: 60 * 1000, // 60 seconds default TTL
            cleanupInterval: 5 * 60 * 1000 // Cleanup every 5 minutes
        };

        // Start cleanup interval
        setInterval(() => this.cleanup(), this.config.cleanupInterval);
    }

    /**
     * Set a value in the cache with optional TTL
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} [ttl] - Time to live in milliseconds
     */
    set(key, value, ttl = this.config.defaultTTL) {
        this.cache.set(key, {
            value,
            expires: Date.now() + ttl
        });
        logger.debug(`Cache set: ${key}`, { ttl });
    }

    /**
     * Get a value from the cache
     * @param {string} key - Cache key
     * @returns {*} Cached value or null if not found/expired
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }

        logger.debug(`Cache hit: ${key}`);
        return item.value;
    }

    /**
     * Delete a value from the cache
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
        logger.debug(`Cache delete: ${key}`);
    }

    /**
     * Clear all expired entries from the cache
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, item] of this.cache.entries()) {
            if (now > item.expires) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
        }
    }

    /**
     * Clear the entire cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        logger.debug(`Cache cleared: ${size} entries removed`);
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const now = Date.now();
        let activeEntries = 0;
        let expiredEntries = 0;

        for (const item of this.cache.values()) {
            if (now > item.expires) {
                expiredEntries++;
            } else {
                activeEntries++;
            }
        }

        return {
            total: this.cache.size,
            active: activeEntries,
            expired: expiredEntries
        };
    }
}

// Export singleton instance
export const cacheService = new CacheService();