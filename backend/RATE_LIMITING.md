# Strava API Rate Limiting Solution

## Problem
Your application was hitting continuous HTTP 429 (Rate Limit Exceeded) errors because:
- **Parallel requests**: Making 2 simultaneous requests per batch in achievements endpoint
- **No queue management**: Requests were made without considering API quota
- **Missing retry logic**: No exponential backoff for rate-limited responses

Strava API limits: **600 requests per 15 minutes** (~1 request per 1.5 seconds)

## Solution Implemented

### 1. **Request Rate Limiter** (`src/services/rateLimit.js`)
A centralized queue system that:
- **Queues all requests** through a single limiter
- **Enforces minimum delays** between requests (150ms default)
- **Monitors rate limit headers** from Strava API responses
- **Throttles automatically** when approaching quota limits (>90% usage)
- **Implements exponential backoff** for 429 responses

### 2. **Strava Service Integration** (`src/services/strava.js`)
All API calls now:
- Go through the rate limiter queue
- Extract and track rate limit headers
- Support retry-after headers for better backoff

### 3. **Achievements Endpoint** (`src/routes/stravaApi.js`)
Changed from:
- ❌ `Promise.all()` with 2 parallel requests
- ❌ No rate limit awareness

To:
- ✅ Sequential processing (1 at a time)
- ✅ Automatic queuing with intelligent delays
- ✅ Better error handling

### 4. **New Monitoring Endpoint**
```bash
GET /api/strava/rate-limit-status
```

Returns:
```json
{
  "requestsUsed": 120,
  "requestsLimit": 600,
  "requestsRemaining": 480,
  "percentageUsed": 20,
  "queueLength": 0,
  "message": "OK: API usage is healthy"
}
```

## Configuration

### Customize Rate Limits
Edit `src/services/strava.js`:

```javascript
const rateLimiter = new RateLimiter({
  requestsPerWindow: 600,        // Strava API limit
  windowMs: 15 * 60 * 1000,      // 15 minutes
  minDelayMs: 150                 // Minimum delay between requests
});
```

### Achievements Endpoint Parameters
The `/api/strava/achievements` endpoint accepts:
- `days`: Time range in days (default: 180, use 'all' for entire history)
- `per_page`: Results per page (default: 100)
- `max_pages`: Maximum pages to fetch (default: 10)
- `batch_delay_ms`: Extra delay between batches (default: 300ms) - now reduced since rate limiter handles it
- `force`: Set to 'true' to bypass cache

## Behavior

### When Rate Limit Approaches
- **At 70% usage**: Logs caution message
- **At 90% usage**: Automatically throttles requests with increasing delays
- **At limit**: Queued requests wait until window resets (15 minutes)

### On 429 Response
- Request is re-queued automatically
- Exponential backoff: starts at 30 seconds, max 60 seconds
- Respects `Retry-After` header if provided by Strava

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Parallel requests | 2 at a time | 1 at a time |
| Rate limit behavior | Ignored | Tracked & respected |
| Retry behavior | None | Exponential backoff |
| Max concurrent in queue | Unlimited | Queued |
| Throttling trigger | Never | At 90% usage |

## Testing

### Check Rate Limit Status
```bash
curl http://localhost:3000/api/strava/rate-limit-status
```

### Fetch Achievements (Will respect rate limits)
```bash
# Get last 90 days
curl "http://localhost:3000/api/strava/achievements?days=90&athlete_id=YOUR_ID"

# Get all achievements (may take longer but won't hit rate limits)
curl "http://localhost:3000/api/strava/achievements?days=all&athlete_id=YOUR_ID"
```

## Monitoring in Logs

You'll see messages like:
```
[STRAVA_API] Requesting /activities/123456 for athlete 76265575
[RateLimit] Waiting before request...
[RateLimit] Updated: 150/600 requests used
[STRAVA_API] Success for /activities/123456
```

When throttling:
```
[RateLimit] High usage (95%), throttling requests
[RateLimit] Waiting 45000ms before next request
```

## Future Improvements

1. **Per-athlete rate limiting**: Track limits per athlete separately
2. **Distributed rate limiting**: Share rate limit state across servers
3. **Predictive throttling**: Pre-emptively slow down before hitting limits
4. **Cache layer**: Cache activity details longer to reduce API calls
5. **Background workers**: Process achievements asynchronously instead of in HTTP request

## References

- [Strava API Rate Limiting Docs](https://developers.strava.com/docs/rate-limiting/)
- Rate limit headers: `X-RateLimit-Usage` and `X-RateLimit-Limit`
- Typical Strava limits: 600 requests per 15-minute window

