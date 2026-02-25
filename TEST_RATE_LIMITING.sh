#!/usr/bin/env bash
# Quick testing script for Rate Limiting

echo "========================================="
echo "🔄 Strava API Rate Limiting Test Guide"
echo "========================================="
echo ""

# Test 1: Check rate limit status
echo "1️⃣  Check current rate limit status:"
echo "   curl http://localhost:3000/api/strava/rate-limit-status"
echo ""

# Test 2: Fetch achievements with rate limiting
echo "2️⃣  Fetch last 90 days achievements:"
echo "   curl 'http://localhost:3000/api/strava/achievements?days=90&athlete_id=YOUR_ATHLETE_ID'"
echo ""

# Test 3: Fetch all achievements (will take longer but respects rate limits)
echo "3️⃣  Fetch all achievements (may take several minutes):"
echo "   curl 'http://localhost:3000/api/strava/achievements?days=all&athlete_id=YOUR_ATHLETE_ID'"
echo ""

# Test 4: Check logs for rate limiting behavior
echo "4️⃣  Watch server logs for rate limiting messages:"
echo "   Look for:"
echo "   - [RateLimit] Waiting before request..."
echo "   - [RateLimit] Updated: X/600 requests used"
echo "   - [RateLimit] High usage (90%+), throttling requests"
echo ""

echo "========================================="
echo "✅ Quick Diagnostic"
echo "========================================="
echo ""
echo "To validate the solution is working:"
echo "1. Start the backend: npm start"
echo "2. Run a test with days=all in achievements"
echo "3. Monitor /api/strava/rate-limit-status in parallel"
echo "4. You should see smooth request processing, not 429 errors"
echo ""
