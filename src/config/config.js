const config = {
    // Default configuration
    defaultOptions: {
        maxHitsPerDay: 500,
        cacheTTL: 3600, // 1 hour in seconds
        retryAttempts: 3,
        retryDelay: 1000, // 1 second
    },

    // Cache configuration
    cache: {
        checkPeriod: 600, // 10 minutes
        deleteOnExpire: true,
        useClones: false,
    },

    // Traffic patterns configuration
    trafficPatterns: {
        peakHours: {
            start: 9, // 9 AM
            end: 17, // 5 PM
        },
        hitDistribution: {
            peak: 0.7, // 70% of hits during peak hours
            offPeak: 0.3, // 30% of hits during off-peak hours
        },
    },

    // MongoDB configuration defaults
    mongodb: {
        url: process.env.MONGODB_URI || 'mongodb://localhost:27017',
        dbName: process.env.MONGODB_DB || 'apiHits',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        },
    },
};

module.exports = config;
