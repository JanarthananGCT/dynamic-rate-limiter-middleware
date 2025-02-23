const NodeCache = require('node-cache');
const config = require('../config/config');

class CacheManager {
    constructor(options = {}) {
        this.cache = new NodeCache({
            ...config.cache,
            stdTTL: options.cacheTTL || config.defaultOptions.cacheTTL,
        });
    }

    /**
     * Set a value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds (optional)
     */
    set(key, value, ttl = null) {
        try {
            return this.cache.set(key, value, ttl);
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {any} Cached value or undefined if not found
     */
    get(key) {
        try {
            return this.cache.get(key);
        } catch (error) {
            console.error('Cache get error:', error);
            return undefined;
        }
    }

    /**
     * Check if key exists in cache
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        try {
            return this.cache.has(key);
        } catch (error) {
            console.error('Cache has error:', error);
            return false;
        }
    }

    /**
     * Delete a key from cache
     * @param {string} key - Cache key
     * @returns {boolean} True if deleted, false otherwise
     */
    delete(key) {
        try {
            return this.cache.del(key);
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }

    /**
     * Generate a cache key for an endpoint
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Request parameters
     * @returns {string} Cache key
     */
    static generateKey(endpoint, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((acc, key) => {
                acc[key] = params[key];
                return acc;
            }, {});

        return `${endpoint}:${JSON.stringify(sortedParams)}`;
    }

    /**
     * Clear all cache
     */
    clear() {
        try {
            return this.cache.flushAll();
        } catch (error) {
            console.error('Cache clear error:', error);
            return false;
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        try {
            return this.cache.getStats();
        } catch (error) {
            console.error('Cache stats error:', error);
            return {};
        }
    }
}

module.exports = CacheManager;
