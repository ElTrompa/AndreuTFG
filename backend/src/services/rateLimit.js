/**
 * Rate Limiter Service for Strava API
 * Handles request queuing, rate limit tracking, and exponential backoff
 * Optimized for high-volume operations like achievements endpoint
 */

class RateLimiter {
  constructor(options = {}) {
    // Strava rate limits: 600 requests per 15 minutes = 100 per 2.5 min = 1 per 1.5 secs
    // However, we use 100 req/15min for read operations (safe limit)
    this.requestsPerWindow = options.requestsPerWindow || 100; // Conservative: 100/15min
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    this.minDelayMs = options.minDelayMs || 200; // Increased from 100 for safety
    this.adaptiveDelayMs = 200; // Adaptive delay based on usage

    // Rate limit state
    this.requestsInWindow = [];
    this.currentLimit = this.requestsPerWindow;
    this.currentUsage = 0;
    this.resetTime = null;

    // Request queue with priorities
    this.highPriorityQueue = [];
    this.normalPriorityQueue = [];
    this.lowPriorityQueue = [];
    this.processing = false;

    // Endpoint tracking for optimization
    this.endpointUsage = {};
    this.lastFlushTime = Date.now();
  }

  /**
   * Update rate limit info from Strava response headers
   * @param {object} headers - Response headers (can be raw node-fetch format or standard fetch)
   */
  updateFromHeaders(headers) {
    if (!headers) return;
    
    let usage, limit;
    
    // Handle node-fetch style headers (arrays)
    if (headers['x-ratelimit-usage']) {
      const val = Array.isArray(headers['x-ratelimit-usage']) 
        ? headers['x-ratelimit-usage'][0]
        : headers['x-ratelimit-usage'];
      usage = parseInt(val, 10);
    }
    
    if (headers['x-ratelimit-limit']) {
      const val = Array.isArray(headers['x-ratelimit-limit'])
        ? headers['x-ratelimit-limit'][0]
        : headers['x-ratelimit-limit'];
      limit = parseInt(val, 10);
    }

    if (!isNaN(usage) && !isNaN(limit)) {
      this.currentUsage = usage;
      this.currentLimit = limit;
      console.log(`[RateLimit] Updated: ${usage}/${limit} requests used`);
    }
  }

  /**
   * Track endpoint usage for analytics
   */
  trackEndpoint(endpoint) {
    this.endpointUsage[endpoint] = (this.endpointUsage[endpoint] || 0) + 1;
  }

  /**
   * Get current rate limit status with detailed analytics
   * @returns {object} Rate limit info
   */
  getStatus() {
    const remaining = Math.max(0, this.currentLimit - this.currentUsage);
    const percentageUsed = Math.round((this.currentUsage / this.currentLimit) * 100);
    
    return {
      requestsUsed: this.currentUsage,
      requestsLimit: this.currentLimit,
      requestsRemaining: remaining,
      percentageUsed: percentageUsed,
      queueLength: this.highPriorityQueue.length + this.normalPriorityQueue.length + this.lowPriorityQueue.length,
      highPriorityQueue: this.highPriorityQueue.length,
      normalPriorityQueue: this.normalPriorityQueue.length,
      lowPriorityQueue: this.lowPriorityQueue.length,
      estimatedResetMs: this.getEstimatedResetTime()
    };
  }

  /**
   * Get estimated time until rate limit resets
   */
  getEstimatedResetTime() {
    const windowAge = Date.now() - (this.resetTime || Date.now());
    const remaining = this.windowMs - windowAge;
    return Math.max(0, remaining);
  }

  /**
   * Queue a request with optional priority
   * @param {function} requestFn - Async function that makes the request
   * @param {string} priority - 'high', 'normal', or 'low'
   * @returns {promise} Resolves with request result
   */
  async enqueue(requestFn, priority = 'normal') {
    return new Promise((resolve, reject) => {
      const request = { requestFn, resolve, reject };
      
      if (priority === 'high') {
        this.highPriorityQueue.push(request);
      } else if (priority === 'low') {
        this.lowPriorityQueue.push(request);
      } else {
        this.normalPriorityQueue.push(request);
      }
      
      this.processQueue();
    });
  }

  /**
   * Process the request queue (high priority first, then normal, then low)
   */
  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.getQueueLength() > 0) {
      // Get next request from appropriate queue
      let request;
      if (this.highPriorityQueue.length > 0) {
        request = this.highPriorityQueue.shift();
      } else if (this.normalPriorityQueue.length > 0) {
        request = this.normalPriorityQueue.shift();
      } else if (this.lowPriorityQueue.length > 0) {
        request = this.lowPriorityQueue.shift();
      }

      if (!request) break;

      const { requestFn, resolve, reject } = request;

      try {
        // Wait before making the request
        await this.waitBeforeRequest();

        // Execute the request
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        // Handle rate limit errors with backoff
        if (error.status === 429) {
          console.warn('[RateLimit] Hit 429, backing off and re-queuing request...');
          // Put request back in queue for retry (high priority)
          this.highPriorityQueue.unshift({ requestFn, resolve, reject });
          // Wait longer before retrying
          await this.backoff(error);
          // Don't process more queue items yet
          break;
        } else {
          reject(error);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Calculate adaptive delay based on current usage
   */
  getAdaptiveDelay() {
    const status = this.getStatus();
    const percentageUsed = status.percentageUsed;

    if (percentageUsed > 90) {
      return 1000; // 1 second delay if >90% used
    } else if (percentageUsed > 75) {
      return 500; // 500ms delay if >75% used
    } else if (percentageUsed > 50) {
      return 300; // 300ms delay if >50% used
    } else {
      return this.minDelayMs; // Default min delay
    }
  }

  /**
   * Wait before making a request
   */
  async waitBeforeRequest() {
    const status = this.getStatus();
    
    // If we're using >90% of quota, wait until reset
    if (status.percentageUsed > 90) {
      console.warn(`[RateLimit] HIGH USAGE (${status.percentageUsed}%), throttling requests`);
      const resetMs = this.getEstimatedResetTime();
      const waitTime = Math.max(5000, resetMs);
      console.log(`[RateLimit] Waiting ${waitTime}ms before next request (reset in ${resetMs}ms)`);
      await sleep(waitTime);
    } else if (status.percentageUsed > 70) {
      console.warn(`[RateLimit] Moderate usage (${status.percentageUsed}%), applying adaptive delay`);
    }
    
    // Apply adaptive delay based on current usage
    const delayMs = this.getAdaptiveDelay();
    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  /**
   * Exponential backoff for rate limit errors with smarter waiting
   */
  async backoff(error) {
    // Extract retry-after if available, otherwise use exponential backoff
    let retryAfter = 30; // Default to 30 seconds
    
    if (error.retryAfter) {
      retryAfter = parseInt(error.retryAfter, 10);
    }
    
    // Be conservative: add buffer to retry-after
    const waitMs = Math.min((retryAfter + 5) * 1000, 120000); // Max 2 minutes
    console.log(`[RateLimit] Backing off for ${waitMs}ms (retry-after: ${retryAfter}s)`);
    await sleep(waitMs);
  }

  /**
   * Get window start time
   */
  getWindowStart() {
    if (!this.resetTime) {
      this.resetTime = Date.now();
    }
    return this.resetTime;
  }

  /**
   * Reset window if expired
   */
  resetIfExpired() {
    const now = Date.now();
    const windowAge = now - this.getWindowStart();
    if (windowAge > this.windowMs) {
      console.log('[RateLimit] 15-minute window expired, resetting counters');
      this.resetTime = now;
      this.currentUsage = 0;
    }
  }

  /**
   * Get total queue length
   */
  getQueueLength() {
    return this.highPriorityQueue.length + this.normalPriorityQueue.length + this.lowPriorityQueue.length;
  }

  /**
   * Get endpoint usage statistics
   */
  getEndpointStats() {
    return this.endpointUsage;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { RateLimiter };
