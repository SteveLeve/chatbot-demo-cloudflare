/**
 * Privacy utilities for GDPR/CCPA compliance
 * Implements SHA-256 hashing for IP addresses with salt using Cloudflare Workers crypto API
 */

/**
 * Hash an IP address using SHA-256 with salt
 * This is one-way hashing - cannot reverse to get original IP
 * Uses Workers crypto.subtle.digest API
 */
export async function hashIpAddress(ip: string, salt: string): Promise<string> {
  if (!ip) {
    return '';
  }

  try {
    // Combine IP with salt
    const toHash = ip + salt;

    // Use crypto.subtle.digest for SHA-256 (available in Workers)
    const encoder = new TextEncoder();
    const data = encoder.encode(toHash);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (error) {
    console.error('[Privacy] Error hashing IP address:', error);
    // Return empty string on error instead of throwing
    return '';
  }
}

/**
 * Validate that hashing is working correctly
 * Same IP should always produce same hash
 */
export async function validateIpHashing(): Promise<boolean> {
  try {
    const testIp = '192.168.1.1';
    const salt = 'test-salt';
    const hash1 = await hashIpAddress(testIp, salt);
    const hash2 = await hashIpAddress(testIp, salt);
    return hash1 === hash2 && hash1.length > 0;
  } catch (error) {
    console.error('[Privacy] IP hash validation failed:', error);
    return false;
  }
}
