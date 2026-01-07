/**
 * Privacy utilities for GDPR/CCPA compliance
 * Implements SHA-256 hashing for IP addresses with salt using Cloudflare Workers crypto API
 */

/**
 * Hash an IP address using SHA-256 with salt
 * This is one-way hashing - cannot reverse to get original IP
 * Uses Workers crypto.subtle.digest API
 * Throws error if hashing fails - caller must handle
 */
export async function hashIpAddress(ip: string, salt: string): Promise<string> {
  if (!ip) {
    throw new Error('[Privacy] Cannot hash empty IP address');
  }

  if (!salt) {
    throw new Error('[Privacy] Cannot hash IP without salt - security misconfiguration');
  }

  // Combine IP with salt
  const toHash = ip + salt;

  let hashBuffer: ArrayBuffer;
  try {
    // Use crypto.subtle.digest for SHA-256 (available in Workers)
    const encoder = new TextEncoder();
    const data = encoder.encode(toHash);
    hashBuffer = await crypto.subtle.digest('SHA-256', data);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Privacy] Failed to compute SHA-256 hash', {
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
      ipLength: ip.length,
      saltLength: salt.length,
    });
    throw new Error(`[Privacy] IP hash computation failed: ${errorMsg}`);
  }

  // Convert buffer to hex string
  let hashHex: string;
  try {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Privacy] Failed to convert hash to hex', {
      error: errorMsg,
      bufferByteLength: hashBuffer.byteLength,
    });
    throw new Error(`[Privacy] Hash conversion to hex failed: ${errorMsg}`);
  }

  // Validate hash result
  if (!hashHex || hashHex.length < 64) {
    console.error('[Privacy] Hash validation failed - invalid hash length', {
      hashLength: hashHex.length,
      expectedLength: 64,
    });
    throw new Error(`[Privacy] Invalid hash result: expected 64 hex chars, got ${hashHex.length}`);
  }

  return hashHex;
}

/**
 * Validate that hashing is working correctly
 * Same IP should always produce same hash
 * Throws error if validation fails, allowing caller to detect crypto API issues
 */
export async function validateIpHashing(): Promise<void> {
  const testIp = '192.168.1.1';
  const salt = 'test-salt';

  let hash1: string;
  let hash2: string;

  try {
    hash1 = await hashIpAddress(testIp, salt);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Privacy] First hash validation computation failed', {
      error: errorMsg,
      testIp,
    });
    throw new Error(`[Privacy] Hash validation failed on first computation: ${errorMsg}`);
  }

  try {
    hash2 = await hashIpAddress(testIp, salt);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Privacy] Second hash validation computation failed', {
      error: errorMsg,
      testIp,
    });
    throw new Error(`[Privacy] Hash validation failed on second computation: ${errorMsg}`);
  }

  // Verify hashes match
  if (hash1 !== hash2) {
    console.error('[Privacy] Hash consistency validation failed', {
      hash1Length: hash1.length,
      hash2Length: hash2.length,
      hashes_match: hash1 === hash2,
    });
    throw new Error(`[Privacy] Hash validation failed: same input produced different hashes`);
  }

  // Verify hash is valid length (SHA-256 = 64 hex chars)
  if (hash1.length !== 64) {
    console.error('[Privacy] Hash length validation failed', {
      hash1Length: hash1.length,
      expectedLength: 64,
    });
    throw new Error(`[Privacy] Hash validation failed: expected 64 hex chars, got ${hash1.length}`);
  }

  // If we get here, validation passed
  console.info('[Privacy] IP hashing validation passed');
}
