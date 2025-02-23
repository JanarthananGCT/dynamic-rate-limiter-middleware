# Dynamic Rate Limiter Middleware

An intelligent rate-limiting and caching middleware for Node.js applications that helps manage API calls to external services with rate limits. This middleware provides smart scheduling, caching, and monitoring capabilities to optimize API usage.

## Features

- 🚀 Intelligent rate limiting based on daily limits
- 💾 Built-in caching system with configurable TTL
- 📊 Traffic pattern analysis and smart scheduling
- 🔄 Automatic retry mechanism with exponential backoff
- 📈 Flexible MongoDB integration
- ⚡ In-memory caching for fast response times
- 🎯 Configurable for multiple APIs and endpoints
- 📝 Detailed logging and monitoring

## Installation

```bash
npm install dynamic-rate-limiter-middleware
```

## Quick Start

```javascript
const express = require('express');
const RateLimiterMiddleware = require('dynamic-rate-limiter-middleware');

const app = express();

// Initialize middleware with custom MongoDB configuration
const rateLimiter = await RateLimiterMiddleware({
    maxHitsPerDay: 500,
    baseUrl: 'https://api.example.com',
    cacheTTL: 3600, // 1 hour in seconds
    mongodb: {
        url: 'mongodb://your-mongodb-url',
        dbName: 'your-database-name',
        options: {
            // Additional MongoDB options
            user: 'username',
            pass: 'password'
        }
    }
});

// Apply middleware to specific routes
app.use('/api', rateLimiter);
```

## MongoDB Configuration

The middleware supports flexible MongoDB configuration:

```javascript
// Using environment variables (recommended)
const rateLimiter = await RateLimiterMiddleware({
    mongodb: {
        url: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DB
    }
});

// Using direct configuration
const rateLimiter = await RateLimiterMiddleware({
    mongodb: {
        url: 'mongodb://localhost:27017',
        dbName: 'apiHits',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            user: 'username',
            pass: 'password'
        }
    }
});

// Using existing mongoose connection
const mongoose = require('mongoose');
await mongoose.connect('mongodb://your-mongodb-url/dbname');
const rateLimiter = await RateLimiterMiddleware();
```

## Configuration Options

```javascript
const options = {
    // Rate limiting
    maxHitsPerDay: 500,
    
    // External API configuration
    baseUrl: 'https://api.example.com',
    
    // Caching
    cacheTTL: 3600, // seconds
    
    // MongoDB configuration
    mongodb: {
        url: 'mongodb://localhost:27017',
        dbName: 'apiHits',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    },
    
    // Traffic patterns
    trafficPatterns: {
        peakHours: {
            start: 9,  // 9 AM
            end: 17    // 5 PM
        },
        hitDistribution: {
            peak: 0.7,    // 70% of hits during peak hours
            offPeak: 0.3  // 30% during off-peak
        }
    },
    
    // Retry configuration
    retryAttempts: 3,
    retryDelay: 1000 // milliseconds
};
```

## Environment Variables

The middleware supports the following environment variables:

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=apiHits
```

## Advanced Usage

### Manual MongoDB Initialization

```javascript
const { initializeMongoDB } = require('dynamic-rate-limiter-middleware');

// Initialize MongoDB connection manually
await initializeMongoDB({
    url: 'mongodb://localhost:27017',
    dbName: 'customDb',
    options: {
        // Your MongoDB options
    }
});
```

### Custom Cache Implementation

```javascript
const { CacheManager } = require('dynamic-rate-limiter-middleware');

const cache = new CacheManager({
    cacheTTL: 1800, // 30 minutes
});
```

### Traffic Pattern Analysis

```javascript
const { HitScheduler } = require('dynamic-rate-limiter-middleware');

const scheduler = new HitScheduler({
    maxHitsPerDay: 1000,
    trafficPatterns: {
        peakHours: { start: 8, end: 18 }
    }
});
```

## Error Handling

The middleware handles various error scenarios:

```javascript
try {
    const rateLimiter = await RateLimiterMiddleware({
        mongodb: {
            url: 'invalid-url'
        }
    });
} catch (error) {
    console.error('Failed to initialize middleware:', error);
}
```

## Best Practices

1. Use environment variables for MongoDB credentials
2. Set appropriate rate limits based on your API provider's constraints
3. Configure cache TTL based on data freshness requirements
4. Monitor analytics to optimize traffic patterns
5. Implement proper error handling in your application

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details
