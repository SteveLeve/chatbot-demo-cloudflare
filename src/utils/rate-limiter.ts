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
export function getRateLimitKeyFromRequest(
  request: Request,
  prefix: string
): string {
  const url = new URL(request.url);
  const agentSession = url.pathname.match(/^\/agents\/[^/]+\/([^/]+)/)?.[1];
  if (agentSession) {
    return `${prefix}:agent-session:${agentSession}`;
  }

  const headerSessionId = request.headers.get('x-chat-session-id');
  if (headerSessionId) {
    return `${prefix}:session:${headerSessionId}`;
  }

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    for (const cookie of cookieHeader.split(';')) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'chat-session-id' && value) {
        return `${prefix}:session:${decodeURIComponent(value)}`;
      }
    }
  }

  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'unknown';
  return `${prefix}:ip:${ip}`;
}

/**
 * Check rate limit for a raw Request (agent WebSocket / HTTP outside Hono).
 */
export async function checkRequestRateLimit(
  request: Request,
  rateLimiter: RateLimit,
  config: RateLimitConfig
): Promise<Response | null> {
  const key = getRateLimitKeyFromRequest(request, config.keyPrefix);

  try {
    const { success } = await rateLimiter.limit({ key });

    if (!success) {
      const retryAfter = config.window;

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

    return null;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return null;
  }
}

/**
 * Generate rate limit key from session ID or IP address
 * Prefers session ID for stability, falls back to IP
 */
function getRateLimitKey(c: Context<{ Bindings: Env }>, prefix: string): string {
  return getRateLimitKeyFromRequest(c.req.raw, prefix);
}
