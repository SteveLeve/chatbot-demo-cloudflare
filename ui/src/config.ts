/**
 * Application Configuration
 *
 * Full-stack architecture: Frontend and API are served from same Worker origin
 *
 * - Development: Vite proxy at localhost:3000 proxies /api/* to localhost:8787
 * - Production: Both served from same origin, no CORS needed
 */

/**
 * Get the API URL for a given path
 * Always uses relative paths since frontend and API share the same origin
 */
export function getApiUrl(path: string): string {
  // Ensure path starts with /
  return path.startsWith('/') ? path : `/${path}`;
}
