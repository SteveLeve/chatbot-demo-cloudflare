/**
 * Security middleware and utilities
 * Addresses Issues #8, #10, and #11
 */

import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types';
import { AppError } from '../types';

/**
 * Security headers middleware
 * Addresses Issue #10: Missing Security Headers
 */
export function securityHeaders(): MiddlewareHandler {
	return async (c, next) => {
		await next();

		// Apply security headers
		c.header('X-Content-Type-Options', 'nosniff');
		c.header('X-Frame-Options', 'DENY');
		c.header('X-XSS-Protection', '1; mode=block');
		c.header('Content-Security-Policy', "default-src 'self'");
		c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
		c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
	};
}

/**
 * Get environment-aware CORS configuration
 * Addresses Issue #8: Overly Permissive CORS
 */
export function getCorsConfig(env: Env) {
	const environment = env.ENVIRONMENT || 'production';

	if (environment === 'development') {
		return {
			origin: ['http://localhost:3000', 'http://localhost:8787'],
			allowMethods: ['GET', 'POST'],
			credentials: true,
		};
	}

	// Production: restrict to specific domain
	return {
		origin: 'https://cloudflare-rag-demo.stevenleve.com',
		allowMethods: ['GET', 'POST'],
		credentials: true,
	};
}

/**
 * Error information returned to client
 */
export interface ErrorInfo {
	code: string;
	message: string;
	details?: Record<string, any>;
}

/**
 * Sanitize error for client response
 * Addresses Issue #11: Error Information Disclosure
 *
 * In production: return generic error messages
 * In development: return detailed error information
 */
export function sanitizeError(error: unknown, env: Env): ErrorInfo {
	const isDevelopment = env.ENVIRONMENT === 'development';

	// Default generic error for production
	const genericError: ErrorInfo = {
		code: 'INTERNAL_ERROR',
		message: 'An internal error occurred. Please try again later.',
	};

	// AppError instances: expose code and message in both environments
	if (error instanceof AppError) {
		return {
			code: error.code,
			message: error.message,
			// Only include details in development
			...(isDevelopment && error.details ? { details: error.details } : {}),
		};
	}

	// Development: return detailed error information
	if (isDevelopment) {
		if (error instanceof Error) {
			return {
				code: error.name || 'ERROR',
				message: error.message,
				details: {
					stack: error.stack,
				},
			};
		}

		return {
			code: 'UNKNOWN_ERROR',
			message: String(error),
			details: { raw: error },
		};
	}

	// Production: return generic error for non-AppError instances

	return genericError;
}
