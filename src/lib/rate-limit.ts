// src/lib/rate-limit.ts
import { LRUCache } from 'lru-cache';
import { NextResponse } from 'next/server';

/**
 * Rate limit result returned by the limiter
 */
export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * Configuration for a rate limiter
 */
interface RateLimitConfig {
  interval: number; // milliseconds
  limit: number;
}

/**
 * In-memory rate limiter using LRU cache
 *
 * This is suitable for development and single-server deployments.
 * For production with multiple servers, use Upstash Redis instead.
 */
class InMemoryRateLimiter {
  private cache: LRUCache<string, { count: number; resetTime: number }>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.cache = new LRUCache({
      max: 10000, // Maximum number of IPs to track
      ttl: config.interval, // Auto-expire entries
    });
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier (usually IP address)
   * @returns Rate limit result with success status and metadata
   */
  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const key = identifier;

    let record = this.cache.get(key);

    // New window - first request or expired
    if (!record || record.resetTime < now) {
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

    // Within existing window - check if limit exceeded
    if (record.count >= this.config.limit) {
      return {
        success: false,
        limit: this.config.limit,
        remaining: 0,
        reset: record.resetTime,
      };
    }

    // Within limit - increment count
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

// ============================================================================
// RATE LIMITERS - Configure different limits for different use cases
// ============================================================================

/**
 * Auth routes rate limiter
 * Strict limits to prevent brute force attacks
 * 5 attempts per 15 minutes
 */
export const authRateLimit = new InMemoryRateLimiter({
  interval: 15 * 60 * 1000, // 15 minutes
  limit: 5,
});

/**
 * API routes rate limiter
 * Moderate limits for general API usage
 * 10 requests per 10 seconds (60 per minute)
 */
export const apiRateLimit = new InMemoryRateLimiter({
  interval: 10 * 1000, // 10 seconds
  limit: 10,
});

/**
 * Search routes rate limiter
 * More lenient limits for search operations
 * 20 requests per minute
 */
export const searchRateLimit = new InMemoryRateLimiter({
  interval: 60 * 1000, // 1 minute
  limit: 20,
});

/**
 * Cron job rate limiter
 * Very strict - only 1 request per minute expected
 */
export const cronRateLimit = new InMemoryRateLimiter({
  interval: 60 * 1000, // 1 minute
  limit: 3, // Allow a few retries in case of failures
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get client identifier from request
 * Tries multiple headers to find the real IP address
 *
 * Priority order:
 * 1. x-forwarded-for (most common behind proxies)
 * 2. x-real-ip (some reverse proxies)
 * 3. 'anonymous' as fallback
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from forwarded headers (when behind proxy/CDN)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be comma-separated list, take first IP
    return forwarded.split(',')[0].trim();
  }

  // Try alternative header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback for local development
  return 'anonymous';
}

/**
 * Add rate limit headers to a NextResponse
 * These headers inform clients about their rate limit status
 *
 * Headers added:
 * - X-RateLimit-Limit: Maximum requests allowed in window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: ISO timestamp when window resets
 * - Retry-After: Seconds until next attempt (only on 429)
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());

  // Add Retry-After header if rate limited
  if (!result.success) {
    const retryAfterSeconds = Math.ceil((result.reset - Date.now()) / 1000);
    response.headers.set('Retry-After', retryAfterSeconds.toString());
  }

  return response;
}

/**
 * Create a rate-limited error response
 * Returns a 429 Too Many Requests response with appropriate headers
 */
export function rateLimitExceededResponse(
  result: RateLimitResult,
  customMessage?: string
): NextResponse {
  const retryAfterSeconds = Math.ceil((result.reset - Date.now()) / 1000);

  const response = NextResponse.json(
    {
      error: customMessage || 'Too many requests. Please try again later.',
      retryAfter: new Date(result.reset).toISOString(),
      retryAfterSeconds,
    },
    { status: 429 }
  );

  return addRateLimitHeaders(response, result);
}

/**
 * Middleware wrapper to apply rate limiting to a route handler
 * Usage example:
 *
 * export const GET = withRateLimit(
 *   async (request) => {
 *     // Your handler logic
 *     return NextResponse.json({ data: 'success' });
 *   },
 *   apiRateLimit,
 *   'Too many API requests'
 * );
 */
export function withRateLimit(
  handler: (request: Request, context?: any) => Promise<NextResponse>,
  limiter: InMemoryRateLimiter,
  errorMessage?: string
) {
  return async (request: Request, context?: any) => {
    const identifier = getClientIdentifier(request);
    const result = await limiter.limit(identifier);

    if (!result.success) {
      return rateLimitExceededResponse(result, errorMessage);
    }

    const response = await handler(request, context);
    return addRateLimitHeaders(response, result);
  };
}
