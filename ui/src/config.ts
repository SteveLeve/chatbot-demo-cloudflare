/**
 * Application Configuration
 *
 * Uses environment variables to configure the API endpoint.
 * In development: Uses Vite proxy to localhost:8787
 * In production: Uses deployed Worker URL
 */

// Get API base URL from environment variable, fallback to relative path for dev
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';

// Helper function to construct API URLs
export function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // If API_BASE_URL is set, use it; otherwise use relative path
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}
