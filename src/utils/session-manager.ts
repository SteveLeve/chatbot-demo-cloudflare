/**
 * Session management for chat conversations in Cloudflare Workers
 * Handles session ID generation and retrieval from request headers/cookies
 */

const SESSION_COOKIE_NAME = 'chat-session-id';
const SESSION_HEADER_NAME = 'x-chat-session-id';
const SESSION_COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

/**
 * Generate a new session ID using crypto.randomUUID()
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Get or create a session ID for the current request
 * Priority: Header > Cookie > New UUID
 */
export function getOrCreateSessionId(request: Request): string {
  // Check header first (for API clients)
  const headerSessionId = request.headers.get(SESSION_HEADER_NAME);
  if (headerSessionId && headerSessionId.length > 0) {
    return headerSessionId;
  }

  // Check cookie
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader || '');
  const cookieSessionId = cookies[SESSION_COOKIE_NAME];
  if (cookieSessionId && cookieSessionId.length > 0) {
    return cookieSessionId;
  }

  // Generate new session ID
  return generateSessionId();
}

/**
 * Parse cookies from Set-Cookie or Cookie header
 * Returns a record of cookie name -> value
 */
export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  // Split by semicolon and parse each cookie
  cookieHeader.split(';').forEach((cookie) => {
    const trimmed = cookie.trim();
    const equalsIndex = trimmed.indexOf('=');

    if (equalsIndex > -1) {
      const name = trimmed.substring(0, equalsIndex);
      const value = trimmed.substring(equalsIndex + 1);
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
}

/**
 * Create a session cookie string for Set-Cookie header
 * Follows HTTP cookie format with secure flags
 */
export function createSessionCookie(sessionId: string): string {
  // Calculate expiration date (90 days from now)
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_COOKIE_MAX_AGE * 1000);

  // Build cookie string
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    `Path=/`,
    `Max-Age=${SESSION_COOKIE_MAX_AGE}`,
    `Expires=${expiresAt.toUTCString()}`,
    `HttpOnly`,
    `Secure`, // Always secure in Workers (HTTPS only)
    `SameSite=Strict`,
  ];

  return cookieParts.join('; ');
}
