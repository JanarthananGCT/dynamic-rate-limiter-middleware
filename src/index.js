const mongoose = require('mongoose');
const createRateLimiter = require('./middleware/rateLimiter');
const CacheManager = require('./utils/cache');
const HitScheduler = require('./utils/scheduler');
const Hit = require('./models/Hit');
const ApiConfig = require('./models/ApiConfig');
const config = require('./config/config');

/**
 * Initialize MongoDB connection
 * @param {Object} mongoConfig MongoDB configuration options
 * @returns {Promise} Mongoose connection promise
 */
async function initializeMongoDB(mongoConfig = {}) {
    const { url, dbName, options } = {
        ...config.mongodb,
        ...mongoConfig,
        options: {
            ...config.mongodb.options,
            ...mongoConfig.options
        }
    };

    try {
        const fullUrl = `${url}/${dbName}`;
        await mongoose.connect(fullUrl, options);
        console.log('MongoDB connected successfully');
        return mongoose.connection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

/**
 * Create a new instance of the rate limiter middleware
 * @param {Object} options Configuration options
 * @param {number} options.maxHitsPerDay Maximum number of hits allowed per day
 * @param {string} options.baseUrl Base URL for the external API
 * @param {number} options.cacheTTL Time to live for cached responses in seconds
 * @param {Object} options.trafficPatterns Custom traffic pattern configuration
 * @param {Object} options.mongodb MongoDB configuration options
 * @returns {Function} Express middleware function
 */
async function RateLimiterMiddleware(options = {}) {
    // Extract MongoDB config from options
    const { mongodb: mongoConfig, ...middlewareOptions } = options;

    // Initialize MongoDB connection if not already connected
    if (mongoose.connection.readyState !== 1) {
        await initializeMongoDB(mongoConfig);
    }

    return createRateLimiter(middlewareOptions);
}

// Export main middleware factory
module.exports = RateLimiterMiddleware;

// Export components for advanced usage
module.exports.CacheManager = CacheManager;
module.exports.HitScheduler = HitScheduler;
module.exports.Hit = Hit;
module.exports.ApiConfig = ApiConfig;
module.exports.config = config;
module.exports.initializeMongoDB = initializeMongoDB;

// Export default configuration
module.exports.defaultConfig = config.defaultOptions;
