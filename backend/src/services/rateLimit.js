/**
 * Rate Limiter Service for Strava API
 * Handles request queuing, rate limit tracking, and exponential backoff
 */

class RateLimiter {
  constructor(options = {}) {
    // Strava rate limits: 600 requests per 15 minutes = 100 per 2.5 min = 1 per 1.5 secs
    this.requestsPerWindow = options.requestsPerWindow || 600;
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    this.minDelayMs = options.minDelayMs || 100; // Minimum delay between requests

    // Rate limit state
    this.requestsInWindow = [];
    this.currentLimit = this.requestsPerWindow;
    this.currentUsage = 0;
    this.resetTime = null;

    // Request queue
    this.queue = [];
    this.processing = false;
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
   * Get current rate limit status
   * @returns {object} Rate limit info
   */
  getStatus() {
    return {
      requestsUsed: this.currentUsage,
      requestsLimit: this.currentLimit,
      requestsRemaining: Math.max(0, this.currentLimit - this.currentUsage),
      percentageUsed: Math.round((this.currentUsage / this.currentLimit) * 100),
      queueLength: this.queue.length
    };
  }

  /**
   * Queue a request to be executed with rate limit awareness
   * @param {function} requestFn - Async function that makes the request
   * @returns {promise} Resolves with request result
   */
  async enqueue(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process the request queue
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { requestFn, resolve, reject } = this.queue.shift();

      try {
        // Wait before making the request
        await this.waitBeforeRequest();

        // Execute the request
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        // Handle rate limit errors with backoff
        if (error.status === 429) {
          console.warn('[RateLimit] Hit 429, backing off...');
          // Put request back in queue for retry
          this.queue.unshift({ requestFn, resolve, reject });
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
   * Wait before making a request
   */
  async waitBeforeRequest() {
    const status = this.getStatus();
    
    // If we're using >90% of quota, wait until reset
    if (status.percentageUsed > 90) {
      console.warn(`[RateLimit] High usage (${status.percentageUsed}%), throttling requests`);
      const waitTime = Math.max(5000, this.windowMs - (Date.now() - this.getWindowStart()));
      console.log(`[RateLimit] Waiting ${waitTime}ms before next request`);
      await sleep(waitTime);
    }
    
    // Ensure minimum delay between requests
    await sleep(this.minDelayMs);
  }

  /**
   * Exponential backoff for rate limit errors
   */
  async backoff(error) {
    // Extract retry-after if available, otherwise use exponential backoff
    const retryAfter = error.retryAfter ? parseInt(error.retryAfter, 10) : 30;
    const waitMs = Math.min(retryAfter * 1000, 60000); // Max 60 seconds
    console.log(`[RateLimit] Backing off for ${waitMs}ms`);
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
      console.log('[RateLimit] Window expired, resetting');
      this.resetTime = now;
      this.currentUsage = 0;
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { RateLimiter };
