# Quick Start Guide - Day 3: Rate Limiting

**Objective:** Implement rate limiting to prevent API abuse and DoS attacks
**Vulnerability:** VULN-003 - No Rate Limiting
**Estimated Effort:** 8 hours
**Status:** PENDING

---

## 🎯 Goals

1. Prevent API abuse
2. Protect against DoS attacks
3. Implement different limits for different endpoints
4. Add rate limit headers to responses
5. Handle rate limit exceeded gracefully

---

## 📋 Implementation Checklist

### Morning (4 hours): Setup Rate Limiting

- [ ] Choose rate limiting solution
  - Option 1: Upstash Redis (recommended for production)
  - Option 2: In-memory (good for development/testing)
- [ ] Install required dependencies
- [ ] Create `/src/lib/rate-limit.ts`
- [ ] Implement rate limiters for different use cases:
  - Auth routes (stricter)
  - API routes (moderate)
  - Search routes (lenient)

### Afternoon (4 hours): Apply Rate Limiting

- [ ] Apply rate limiting to auth routes
- [ ] Apply rate limiting to ETF routes
- [ ] Apply rate limiting to stock routes
- [ ] Add rate limit headers to all responses
- [ ] Test rate limiting behavior
- [ ] Update API documentation

---

## 🔧 Implementation Steps

### Step 1: Choose Rate Limiting Solution

#### Option A: Upstash Redis (Production - Recommended)

**Pros:**
- Distributed - works across multiple servers
- Persistent - survives server restarts
- Free tier available
- Built-in analytics

**Cons:**
- Requires external service
- Slight latency overhead

**Installation:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Setup:**
1. Sign up at https://upstash.com/
2. Create a Redis database
3. Copy REST URL and token
4. Add to `.env.local`:
```env
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

---

#### Option B: In-Memory (Development - Simpler)

**Pros:**
- No external dependencies
- Zero latency
- Easy to set up
- Good for development

**Cons:**
- Not distributed - only works on single server
- Lost on server restart
- No analytics

**Installation:**
```bash
npm install lru-cache
```

**No environment variables needed!**

---

### Step 2: Create Rate Limiter

Create `/src/lib/rate-limit.ts`:

#### For Upstash (Production):

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Auth routes - 5 attempts per 15 minutes
export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: 'rl:auth',
});

// API routes - 10 requests per 10 seconds
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: 'rl:api',
});

// Search routes - 20 requests per minute
export const searchRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix: 'rl:search',
});

// Helper function to get client identifier
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return 'anonymous';
}

// Helper to add rate limit headers to response
export function addRateLimitHeaders(
  response: Response,
  result: { success: boolean; limit: number; remaining: number; reset: number }
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
```

---

#### For In-Memory (Development):

```typescript
// src/lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

interface RateLimitConfig {
  interval: number; // milliseconds
  limit: number;
}

class InMemoryRateLimiter {
  private cache: LRUCache<string, { count: number; resetTime: number }>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.cache = new LRUCache({
      max: 10000,
      ttl: config.interval,
    });
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const key = identifier;

    let record = this.cache.get(key);

    if (!record || record.resetTime < now) {
      // New window
      record = {
        count: 1,
        resetTime: now + this.config.interval,
      };
      this.cache.set(key, record);

      return {
        success: true,
        limit: this.config.limit,
        remaining: this.config.limit - 1,
        reset: record.resetTime,
      };
    }

    // Within existing window
    if (record.count >= this.config.limit) {
      return {
        success: false,
        limit: this.config.limit,
        remaining: 0,
        reset: record.resetTime,
      };
    }

    record.count++;
    this.cache.set(key, record);

    return {
      success: true,
      limit: this.config.limit,
      remaining: this.config.limit - record.count,
      reset: record.resetTime,
    };
  }
}

// Auth routes - 5 attempts per 15 minutes
export const authRateLimit = new InMemoryRateLimiter({
  interval: 15 * 60 * 1000, // 15 minutes
  limit: 5,
});

// API routes - 10 requests per 10 seconds
export const apiRateLimit = new InMemoryRateLimiter({
  interval: 10 * 1000, // 10 seconds
  limit: 10,
});

// Search routes - 20 requests per minute
export const searchRateLimit = new InMemoryRateLimiter({
  interval: 60 * 1000, // 1 minute
  limit: 20,
});

// Helper function to get client identifier
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return 'anonymous';
}

// Helper to add rate limit headers to response
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
```

---

### Step 3: Apply to Auth Routes

**File:** `/src/app/api/auth/register/route.ts`

```typescript
import { authRateLimit, getClientIdentifier, addRateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // ✅ CHECK RATE LIMIT
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await authRateLimit.limit(identifier);

    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        {
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: new Date(rateLimitResult.reset).toISOString()
        },
        { status: 429 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    // ... existing validation and logic

    const response = NextResponse.json(user, { status: 201 });
    return addRateLimitHeaders(response, rateLimitResult);

  } catch (error) {
    // ... existing error handling
  }
}
```

---

### Step 4: Apply to ETF Routes

**File:** `/src/app/api/etfs/route.ts`

```typescript
import { apiRateLimit, getClientIdentifier, addRateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    // ✅ CHECK RATE LIMIT
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await apiRateLimit.limit(identifier);

    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    // ... existing logic

    const response = NextResponse.json(etfs);
    return addRateLimitHeaders(response, rateLimitResult);

  } catch (error) {
    // ... existing error handling
  }
}

export async function POST(request: Request) {
  // Similar implementation
}
```

---

### Step 5: Apply to Search Routes

**File:** `/src/app/api/stocks/search/route.ts`

```typescript
import { searchRateLimit, getClientIdentifier, addRateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    // ✅ CHECK RATE LIMIT
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await searchRateLimit.limit(identifier);

    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many search requests. Please wait before searching again.' },
        { status: 429 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    // ... existing validation and logic

    const response = NextResponse.json(stocks);
    return addRateLimitHeaders(response, rateLimitResult);

  } catch (error) {
    // ... existing error handling
  }
}
```

---

## 🧪 Testing

### Test Rate Limiting with curl

```bash
# Test auth rate limiting (5 requests per 15 minutes)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test'$i'@example.com","password":"Test123!"}' \
    -i
  echo "\n---\n"
done

# Test API rate limiting (10 requests per 10 seconds)
for i in {1..15}; do
  curl http://localhost:3000/api/etfs -i
  echo "\n---\n"
done

# Test search rate limiting (20 requests per minute)
for i in {1..25}; do
  curl "http://localhost:3000/api/stocks/search?q=AAPL" -i
  echo "\n---\n"
done
```

### Expected Headers

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
```

When rate limited:

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
Retry-After: 42
```

---

## 📊 Rate Limit Configuration

| Endpoint Type | Limit | Window | Reasoning |
|---------------|-------|--------|-----------|
| Auth (register/login) | 5 | 15 min | Prevent brute force |
| API (ETF CRUD) | 10 | 10 sec | Balance usability & protection |
| Search | 20 | 1 min | Allow quick searches |

**Adjust these values based on your needs!**

---

## ✅ Success Criteria

- [ ] Rate limiter installed and configured
- [ ] All API routes protected
- [ ] Rate limit headers present in responses
- [ ] 429 status code returned when exceeded
- [ ] Clear error messages to users
- [ ] Different limits for different endpoint types
- [ ] Rate limits reset after window expires

---

## 🚀 Ready to Start?

```bash
# Choose your implementation:

# Option A: Production with Upstash
npm install @upstash/ratelimit @upstash/redis

# Option B: Development with in-memory
npm install lru-cache

# Then create /src/lib/rate-limit.ts and start implementing!
```

**Good luck with Day 3!** 🎯
