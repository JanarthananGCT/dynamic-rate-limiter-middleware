const axios = require('axios');
const CacheManager = require('../utils/cache');
const HitScheduler = require('../utils/scheduler');
const Hit = require('../models/Hit');
const ApiConfig = require('../models/ApiConfig');
const config = require('../config/config');

/**
 * Creates a rate limiter middleware instance
 * @param {Object} options Configuration options
 * @returns {Function} Express middleware function
 */
function createRateLimiter(options = {}) {
    // Initialize components
    const cache = new CacheManager(options);
    const scheduler = new HitScheduler(options);

    return async function rateLimiter(req, res, next) {
        const startTime = Date.now();
        const endpoint = req.path;
        const method = req.method;
        let hit = null; // Declare hit outside try block

        try {
            // Get or create API configuration
            const apiConfig = await ApiConfig.findByEndpoint(endpoint, method) || 
                            await new ApiConfig({ 
                                endpoint, 
                                method,
                                baseUrl: options.baseUrl,
                                rateLimit: { daily: options.maxHitsPerDay || config.defaultOptions.maxHitsPerDay }
                            }).save();

            if (!apiConfig.isActive) {
                return res.status(403).json({ 
                    error: 'API endpoint is not active' 
                });
            }

            // Get or create hit record
            hit = new Hit({
                userId: req.user ? req.user.id : null,
                endpoint,
                method,
                dailyLimit: apiConfig.rateLimit.daily
            });
            await hit.save();

            // Check cache first
            const cacheKey = CacheManager.generateKey(endpoint, req.query);
            if (apiConfig.cacheConfig.enabled) {
                const cachedResponse = cache.get(cacheKey);
                if (cachedResponse) {
                    return res.json(cachedResponse);
                }
            }

            // Check rate limits and scheduling
            const schedulingDecision = scheduler.calculateAvailableHits(
                hit.hits,
                hit.lastHit
            );

            if (!schedulingDecision.canMakeHit) {
                // Try to serve stale cache if available
                const cachedResponse = cache.get(cacheKey);
                if (cachedResponse) {
                    return res.json({
                        data: cachedResponse,
                        source: 'cache',
                        warning: 'Rate limit reached, serving cached data'
                    });
                }

                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    waitTime: schedulingDecision.waitTime,
                    reason: schedulingDecision.reason
                });
            }

            // Prepare for external API call
            const axiosConfig = {
                method,
                url: `${apiConfig.baseUrl}${endpoint}`,
                headers: Object.fromEntries(apiConfig.headers),
                params: req.query,
                data: req.body
            };

            // Make the external API call with retry logic
            let response;
            let retryCount = 0;
            while (retryCount <= apiConfig.retryConfig.attempts) {
                try {
                    response = await axios(axiosConfig);
                    break;
                } catch (error) {
                    if (!apiConfig.shouldRetry(error.response?.status) || 
                        retryCount === apiConfig.retryConfig.attempts) {
                        throw error;
                    }
                    retryCount++;
                    const delay = scheduler.getRetryDelay(retryCount);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            // Record successful hit
            const responseTime = Date.now() - startTime;
            await hit.recordHit(responseTime, true);

            // Cache the response
            if (apiConfig.cacheConfig.enabled && response.data) {
                cache.set(cacheKey, response.data, apiConfig.cacheConfig.ttl);
            }

            // Send response
            return res.json({
                data: response.data,
                source: 'api',
                metrics: {
                    responseTime,
                    remainingHits: apiConfig.rateLimit.daily - hit.hits
                }
            });

        } catch (error) {
            // Record error only if hit exists
            if (hit) {
                try {
                    await hit.recordError(
                        error.response?.status || 500,
                        error.message
                    );
                } catch (recordError) {
                    // Silently handle error recording failure
                    console.error('Failed to record error:', recordError);
                }
            }

            // Handle errors
            const status = error.response?.status || 500;
            const errorResponse = {
                error: error.message,
                status,
                endpoint,
                method
            };

            // Try to use fallback response if configured
            try {
                const apiConfig = await ApiConfig.findByEndpoint(endpoint, method);
                if (apiConfig?.errorHandling.fallbackResponse) {
                    return res.status(status).json({
                        ...apiConfig.errorHandling.fallbackResponse,
                        source: 'fallback',
                        originalError: errorResponse
                    });
                }
            } catch (configError) {
                // If we can't get the config, continue to default error handling
                console.error('Failed to get API config for fallback:', configError);
            }

            next(error);
        }
    };
}

module.exports = createRateLimiter;
