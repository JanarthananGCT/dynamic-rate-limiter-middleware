const moment = require('moment-timezone');
const config = require('../config/config');

class HitScheduler {
    constructor(options = {}) {
        this.trafficPatterns = {
            ...config.trafficPatterns,
            ...options.trafficPatterns
        };
        this.maxHitsPerDay = options.maxHitsPerDay || config.defaultOptions.maxHitsPerDay;
    }

    /**
     * Check if current time is within peak hours
     * @returns {boolean}
     */
    isPeakHour() {
        const currentHour = moment().hour();
        return currentHour >= this.trafficPatterns.peakHours.start && 
               currentHour < this.trafficPatterns.peakHours.end;
    }

    /**
     * Calculate available hits for the current period
     * @param {number} usedHits - Number of hits already used today
     * @param {Date} lastHitTime - Timestamp of the last hit
     * @returns {Object} Available hits and wait time
     */
    calculateAvailableHits(usedHits, lastHitTime) {
        const remainingHits = this.maxHitsPerDay - usedHits;
        if (remainingHits <= 0) {
            return { 
                canMakeHit: false, 
                waitTime: this.getTimeUntilReset(),
                reason: 'Daily limit reached'
            };
        }

        const isPeak = this.isPeakHour();
        const hourlyLimit = this.calculateHourlyLimit(isPeak, remainingHits);
        
        // Calculate time since last hit
        const timeSinceLastHit = lastHitTime ? 
            moment().diff(moment(lastHitTime), 'seconds') : 
            Number.MAX_SAFE_INTEGER;

        // Minimum time between hits based on remaining hits and time left in the day
        const minTimeBetweenHits = this.calculateMinTimeBetweenHits(remainingHits);

        if (timeSinceLastHit < minTimeBetweenHits) {
            return {
                canMakeHit: false,
                waitTime: minTimeBetweenHits - timeSinceLastHit,
                reason: 'Rate limiting'
            };
        }

        return {
            canMakeHit: true,
            waitTime: 0,
            hourlyLimit
        };
    }

    /**
     * Calculate hourly hit limit based on peak/off-peak hours
     * @param {boolean} isPeak - Whether current hour is peak
     * @param {number} remainingHits - Remaining hits for the day
     * @returns {number} Hourly hit limit
     */
    calculateHourlyLimit(isPeak, remainingHits) {
        const distribution = isPeak ? 
            this.trafficPatterns.hitDistribution.peak : 
            this.trafficPatterns.hitDistribution.offPeak;
        
        return Math.ceil(remainingHits * distribution);
    }

    /**
     * Calculate minimum time between hits based on remaining hits and time
     * @param {number} remainingHits - Remaining hits for the day
     * @returns {number} Minimum seconds between hits
     */
    calculateMinTimeBetweenHits(remainingHits) {
        const secondsLeftInDay = this.getTimeUntilReset();
        return Math.ceil(secondsLeftInDay / remainingHits);
    }

    /**
     * Get seconds until daily reset
     * @returns {number} Seconds until reset
     */
    getTimeUntilReset() {
        const now = moment();
        const endOfDay = moment().endOf('day');
        return endOfDay.diff(now, 'seconds');
    }

    /**
     * Get optimal retry time when rate limit is hit
     * @param {number} attemptNumber - Current attempt number
     * @returns {number} Milliseconds to wait before retry
     */
    getRetryDelay(attemptNumber) {
        const baseDelay = config.defaultOptions.retryDelay;
        return Math.min(
            baseDelay * Math.pow(2, attemptNumber - 1),
            30000 // Max 30 seconds
        );
    }

    /**
     * Get scheduling metrics for monitoring
     * @returns {Object} Scheduling metrics
     */
    getMetrics() {
        return {
            isPeakHour: this.isPeakHour(),
            maxHitsPerDay: this.maxHitsPerDay,
            peakHours: this.trafficPatterns.peakHours,
            distribution: this.trafficPatterns.hitDistribution
        };
    }
}

module.exports = HitScheduler;
