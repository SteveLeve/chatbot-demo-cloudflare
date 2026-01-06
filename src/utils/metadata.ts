/**
 * Cloudflare-specific metadata extraction utilities
 * Extracts client info from Cloudflare request context
 */

import type { Context } from 'hono';
import type { Env } from '../types';

/**
 * Cloudflare metadata extracted from cf object
 */
export interface CloudflareMetadata {
  userAgent: string;
  country: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  colo: string | null;
  asn: number | null;
}

/**
 * Extract IP address from request
 * Checks multiple header sources: cf-connecting-ip, x-forwarded-for, x-real-ip
 */
export function extractIpAddress(c: Context<{ Bindings: Env }>): string {
  // Cloudflare Workers sets cf-connecting-ip header
  const cfConnectingIp = c.req.header('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to x-forwarded-for (may contain multiple IPs, take first)
  const xForwardedFor = c.req.header('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  // Fallback to x-real-ip
  const xRealIp = c.req.header('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  return 'unknown';
}

/**
 * Extract Cloudflare metadata from request context
 * Accesses the cf object on c.req.raw for Cloudflare-specific data
 */
export function extractCloudflareMetadata(c: Context<{ Bindings: Env }>): CloudflareMetadata {
  const userAgent = c.req.header('user-agent') || '';

  // Get Cloudflare cf object from the raw request
  const cf = (c.req.raw as any).cf || {};

  return {
    userAgent,
    country: cf.country || null,
    region: cf.region || null,
    city: cf.city || null,
    lat: cf.latitude ? parseFloat(cf.latitude) : null,
    lng: cf.longitude ? parseFloat(cf.longitude) : null,
    timezone: cf.timezone || null,
    colo: cf.colo || null,
    asn: cf.asn ? parseInt(cf.asn, 10) : null,
  };
}

/**
 * Validate that metadata extraction is working
 * Useful for debugging in development
 */
export function validateMetadataExtraction(metadata: CloudflareMetadata): boolean {
  // At minimum, we should have userAgent
  return metadata.userAgent.length > 0;
}
