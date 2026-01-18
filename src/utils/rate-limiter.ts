/**
 * Rate limiting middleware for Cloudflare Workers
 * Uses Cloudflare Workers Rate Limiting API to protect endpoints from abuse
 */

import type { Context } from 'hono';
import type { Env } from '../types';

export interface RateLimitConfig {
  limit: number; // Maximum requests allowed
  window: number; // Time window in seconds
  keyPrefix: string; // Prefix for rate limit key (e.g., 'query', 'ingest')
}

/**
 * Check rate limit for the current request
 * Returns 429 response if limit exceeded, null if allowed
 */
export async function checkRateLimit(
  c: Context<{ Bindings: Env }>,
  rateLimiter: RateLimit,
  config: RateLimitConfig
): Promise<Response | null> {
  // Generate rate limit key from session ID or IP
  const key = getRateLimitKey(c, config.keyPrefix);

  try {
    // Check rate limit using Cloudflare Workers Rate Limiting API
    const { success } = await rateLimiter.limit({ key });

    if (!success) {
      // Rate limit exceeded - return 429 with retry information
      const retryAfter = config.window; // Simplified: use window duration

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Maximum ${config.limit} requests per ${config.window} seconds.`,
            details: {
              limit: config.limit,
              window: config.window,
              retryAfter,
            },
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.limit.toString(),
            'X-RateLimit-Window': config.window.toString(),
          },
        }
      );
    }

    // Rate limit not exceeded - add informational headers
    c.header('X-RateLimit-Limit', config.limit.toString());
    c.header('X-RateLimit-Window', config.window.toString());

    return null; // Allow request to proceed
  } catch (error) {
    // Log error but don't block request (fail open for availability)
    console.error('Rate limit check failed:', error);
    return null; // Allow request on rate limiter failure
  }
}

/**
 * Generate rate limit key from session ID or IP address
 * Prefers session ID for stability, falls back to IP
 */
function getRateLimitKey(c: Context<{ Bindings: Env }>, prefix: string): string {
  // Try to extract session ID first (more stable than IP)
  const sessionId = extractSessionId(c);
  if (sessionId) {
    return `${prefix}:session:${sessionId}`;
  }

  // Fall back to IP address
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  return `${prefix}:ip:${ip}`;
}

/**
 * Extract session ID from headers or cookies
 * Returns null if no session ID found
 */
function extractSessionId(c: Context<{ Bindings: Env }>): string | null {
  // Check header first
  const headerSessionId = c.req.header('x-chat-session-id');
  if (headerSessionId && headerSessionId.length > 0) {
    return headerSessionId;
  }

  // Check cookies
  const cookieHeader = c.req.header('cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'chat-session-id' && value) {
      return decodeURIComponent(value);
    }
  }

  return null;
}
