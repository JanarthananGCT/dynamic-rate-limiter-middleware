const mongoose = require('mongoose');

const apiConfigSchema = new mongoose.Schema({
    // API endpoint configuration
    endpoint: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default: 'GET'
    },
    baseUrl: {
        type: String,
        required: true
    },
    headers: {
        type: Map,
        of: String,
        default: new Map()
    },

    // Rate limiting configuration
    rateLimit: {
        daily: {
            type: Number,
            required: true,
            min: 1,
            default: 500
        },
        hourly: {
            type: Number,
            min: 1
        },
        concurrent: {
            type: Number,
            min: 1,
            default: 1
        }
    },

    // Cache configuration
    cacheConfig: {
        enabled: {
            type: Boolean,
            default: true
        },
        ttl: {
            type: Number,
            default: 3600, // 1 hour in seconds
            min: 0
        },
        strategy: {
            type: String,
            enum: ['simple', 'sliding', 'adaptive'],
            default: 'simple'
        }
    },

    // Retry configuration
    retryConfig: {
        attempts: {
            type: Number,
            default: 3,
            min: 0
        },
        delay: {
            type: Number,
            default: 1000, // 1 second
            min: 0
        },
        backoff: {
            type: Boolean,
            default: true
        }
    },

    // Traffic pattern configuration
    trafficPattern: {
        peakHours: {
            start: {
                type: Number,
                default: 9,
                min: 0,
                max: 23
            },
            end: {
                type: Number,
                default: 17,
                min: 0,
                max: 23
            }
        },
        distribution: {
            peak: {
                type: Number,
                default: 0.7,
                min: 0,
                max: 1
            },
            offPeak: {
                type: Number,
                default: 0.3,
                min: 0,
                max: 1
            }
        },
        timezone: {
            type: String,
            default: 'UTC'
        }
    },

    // Error handling configuration
    errorHandling: {
        retryOnStatus: {
            type: [Number],
            default: [408, 429, 500, 502, 503, 504]
        },
        fallbackResponse: mongoose.Schema.Types.Mixed
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'apiConfigs'
});

// Middleware to update lastUpdated
apiConfigSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

// Validate traffic pattern distribution
apiConfigSchema.pre('validate', function(next) {
    const { peak, offPeak } = this.trafficPattern.distribution;
    if (peak + offPeak !== 1) {
        next(new Error('Traffic pattern distribution must sum to 1'));
    }
    next();
});

// Instance methods
apiConfigSchema.methods.isWithinPeakHours = function(date = new Date()) {
    const hour = date.getHours();
    const { start, end } = this.trafficPattern.peakHours;
    return hour >= start && hour < end;
};

apiConfigSchema.methods.shouldRetry = function(statusCode) {
    return this.errorHandling.retryOnStatus.includes(statusCode);
};

// Static methods
apiConfigSchema.statics.findByEndpoint = function(endpoint, method = 'GET') {
    return this.findOne({ endpoint, method, isActive: true });
};

apiConfigSchema.statics.updateConfig = async function(endpoint, method, updates) {
    const config = await this.findOne({ endpoint, method });
    if (!config) {
        throw new Error('API configuration not found');
    }
    
    Object.assign(config, updates);
    return config.save();
};

const ApiConfig = mongoose.model('ApiConfig', apiConfigSchema);

module.exports = ApiConfig;
