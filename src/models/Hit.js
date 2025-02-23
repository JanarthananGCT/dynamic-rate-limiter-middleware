const mongoose = require('mongoose');

const hitSchema = new mongoose.Schema({
    // API endpoint information
    endpoint: {
        type: String,
        required: true,
        index: true
    },
    method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default: 'GET'
    },

    // Hit tracking
    hits: {
        type: Number,
        default: 0,
        min: 0
    },
    lastHit: {
        type: Date,
        default: Date.now
    },
    dailyLimit: {
        type: Number,
        required: true,
        default: 500
    },

    // Response caching
    responseData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    cacheExpiry: {
        type: Date,
        default: null
    },

    // Traffic pattern analysis
    trafficPattern: {
        peak: {
            type: Number,
            default: 0
        },
        offPeak: {
            type: Number,
            default: 0
        },
        timezone: {
            type: String,
            default: 'UTC'
        }
    },

    // Error tracking
    errors: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        code: String,
        message: String
    }],

    // Analytics
    successRate: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    averageResponseTime: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    collection: 'hits'
});

// Index for efficient querying
hitSchema.index({ endpoint: 1, method: 1 });
hitSchema.index({ lastHit: 1 });

// Method to check if daily limit is reached
hitSchema.methods.isLimitReached = function() {
    const today = new Date();
    const lastHitDate = this.lastHit;
    
    // Reset hits if it's a new day
    if (lastHitDate && lastHitDate.getDate() !== today.getDate()) {
        this.hits = 0;
        return false;
    }
    
    return this.hits >= this.dailyLimit;
};

// Method to update hit count and analytics
hitSchema.methods.recordHit = async function(responseTime, isSuccess) {
    // Update hit count
    this.hits += 1;
    this.lastHit = new Date();

    // Update success rate
    const totalHits = this.hits;
    const currentSuccessRate = this.successRate;
    this.successRate = ((currentSuccessRate * (totalHits - 1)) + (isSuccess ? 100 : 0)) / totalHits;

    // Update average response time
    this.averageResponseTime = 
        ((this.averageResponseTime * (totalHits - 1)) + responseTime) / totalHits;

    // Update traffic pattern
    const hour = this.lastHit.getHours();
    if (hour >= 9 && hour < 17) { // Peak hours (9 AM - 5 PM)
        this.trafficPattern.peak += 1;
    } else {
        this.trafficPattern.offPeak += 1;
    }

    return this.save();
};

// Method to record errors
hitSchema.methods.recordError = function(code, message) {
    this.errors.push({
        timestamp: new Date(),
        code,
        message
    });
    
    if (this.errors.length > 100) { // Keep only last 100 errors
        this.errors = this.errors.slice(-100);
    }
    
    return this.save();
};

// Static method to get analytics
hitSchema.statics.getAnalytics = async function(endpoint) {
    const pipeline = [
        {
            $match: endpoint ? { endpoint } : {}
        },
        {
            $group: {
                _id: '$endpoint',
                totalHits: { $sum: '$hits' },
                averageSuccessRate: { $avg: '$successRate' },
                averageResponseTime: { $avg: '$averageResponseTime' },
                peakHits: { $sum: '$trafficPattern.peak' },
                offPeakHits: { $sum: '$trafficPattern.offPeak' }
            }
        }
    ];

    return this.aggregate(pipeline);
};

const Hit = mongoose.model('Hit', hitSchema);

module.exports = Hit;
