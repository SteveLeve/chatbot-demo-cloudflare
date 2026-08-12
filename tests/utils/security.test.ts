import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
	getCorsConfig,
	sanitizeError,
	securityHeaders,
} from '../../src/utils/security';
import { AppError } from '../../src/types';
import type { Env } from '../../src/types';

describe('Security Utils', () => {
	// Create mock environment for testing
	const createMockEnv = (environment: string): Env => {
		return {
			ENVIRONMENT: environment,
			LOG_LEVEL: 'INFO',
			DEFAULT_TOP_K: 3,
			MAX_QUERY_LENGTH: 500,
			DEFAULT_CHUNK_SIZE: 500,
			DEFAULT_CHUNK_OVERLAP: 100,
			ENABLE_TEXT_SPLITTING: true,
			CHAT_LOG_IP_SALT: 'test-salt',
		} as unknown as Env;
	};

	describe('getCorsConfig', () => {
		it('should return localhost origins for development environment', () => {
			const env = createMockEnv('development');
			const config = getCorsConfig(env);

			expect(config.origin).toEqual([
				'http://localhost:3000',
				'http://localhost:8787',
			]);
			expect(config.allowMethods).toEqual(['GET', 'POST', 'DELETE']);
			expect(config.credentials).toBe(true);
		});

		it('should return production domain for production environment', () => {
			const env = createMockEnv('production');
			const config = getCorsConfig(env);

			expect(config.origin).toBe('https://cloudflare-rag-demo.stevenleve.com');
			expect(config.allowMethods).toEqual(['GET', 'POST', 'DELETE']);
			expect(config.credentials).toBe(true);
		});

		it('should default to production if environment is not set', () => {
			const env = { ...createMockEnv('production'), ENVIRONMENT: '' } as Env;
			const config = getCorsConfig(env);

			expect(config.origin).toBe('https://cloudflare-rag-demo.stevenleve.com');
		});

		it('should allow DELETE preflight for privacy delete endpoint', async () => {
			const env = createMockEnv('development');
			const app = new Hono();
			app.use('/*', async (c, next) => {
				const corsConfig = getCorsConfig(env);
				return cors(corsConfig)(c, next);
			});
			app.delete('/api/privacy/delete', (c) => c.json({ success: true }));

			const res = await app.request('/api/privacy/delete', {
				method: 'OPTIONS',
				headers: {
					Origin: 'http://localhost:3000',
					'Access-Control-Request-Method': 'DELETE',
				},
			});

			expect(res.status).toBe(204);
			expect(res.headers.get('Access-Control-Allow-Methods')).toContain(
				'DELETE',
			);
		});
	});

	describe('sanitizeError', () => {
		describe('in development environment', () => {
			const env = createMockEnv('development');

			it('should return detailed error information for Error instances', () => {
				const error = new Error('Test error message');
				error.stack = 'Stack trace here';

				const result = sanitizeError(error, env);

				expect(result.code).toBe('Error');
				expect(result.message).toBe('Test error message');
				expect(result.details).toBeDefined();
				expect(result.details?.['stack']).toBe('Stack trace here');
			});

			it('should return error name as code if available', () => {
				const error = new Error('Test error');
				error.name = 'CustomError';

				const result = sanitizeError(error, env);

				expect(result.code).toBe('CustomError');
				expect(result.message).toBe('Test error');
			});

			it('should handle non-Error objects', () => {
				const error = { custom: 'error object' };
				const result = sanitizeError(error, env);

				expect(result.code).toBe('UNKNOWN_ERROR');
				expect(result.message).toBe('[object Object]');
				expect(result.details?.['raw']).toEqual(error);
			});

			it('should handle string errors', () => {
				const error = 'String error message';
				const result = sanitizeError(error, env);

				expect(result.code).toBe('UNKNOWN_ERROR');
				expect(result.message).toBe('String error message');
			});

			it('should handle null and undefined', () => {
				const result1 = sanitizeError(null, env);
				expect(result1.code).toBe('UNKNOWN_ERROR');
				expect(result1.message).toBe('null');

				const result2 = sanitizeError(undefined, env);
				expect(result2.code).toBe('UNKNOWN_ERROR');
				expect(result2.message).toBe('undefined');
			});
		});

		describe('in production environment', () => {
			const env = createMockEnv('production');

			it('should return generic error for Error instances', () => {
				const error = new Error('Internal database connection failed');
				error.stack = 'Sensitive stack trace';

				const result = sanitizeError(error, env);

				expect(result.code).toBe('INTERNAL_ERROR');
				expect(result.message).toBe(
					'An internal error occurred. Please try again later.',
				);
				expect(result.details).toBeUndefined();
			});

			it('should expose AppError details in production', () => {
				const error = new AppError(
					'Validation failed',
					'VALIDATION_ERROR',
					400,
				);
				const result = sanitizeError(error, env);

				expect(result.code).toBe('VALIDATION_ERROR');
				expect(result.message).toBe('Validation failed');
			});

			it('should return generic error for non-Error objects', () => {
				const error = { sensitive: 'data' };
				const result = sanitizeError(error, env);

				expect(result.code).toBe('INTERNAL_ERROR');
				expect(result.message).toBe(
					'An internal error occurred. Please try again later.',
				);
				expect(result.details).toBeUndefined();
			});

			it('should return generic error for string errors', () => {
				const error = 'Database connection string: postgres://...';
				const result = sanitizeError(error, env);

				expect(result.code).toBe('INTERNAL_ERROR');
				expect(result.message).toBe(
					'An internal error occurred. Please try again later.',
				);
			});

			it('should handle AppError with custom status code', () => {
				const error = new AppError('Resource not found', 'NOT_FOUND', 404, {
					resource: 'user',
				});
				const result = sanitizeError(error, env);

				expect(result.code).toBe('NOT_FOUND');
				expect(result.message).toBe('Resource not found');
				// Details should not be exposed in production
				expect(result.details).toBeUndefined();
			});

			it('should not leak internal error messages', () => {
				const sensitiveErrors = [
					new Error('Connection to postgres://admin:password@db failed'),
					new Error('API key abc123def456 is invalid'),
					new Error('File not found: /etc/passwd'),
					new Error('Stack overflow in module xyz.ts'),
				];

				for (const error of sensitiveErrors) {
					const result = sanitizeError(error, env);
					expect(result.message).toBe(
						'An internal error occurred. Please try again later.',
					);
					expect(result.message).not.toContain('postgres://');
					expect(result.message).not.toContain('abc123');
					expect(result.message).not.toContain('/etc/passwd');
				}
			});
		});

		describe('AppError handling across environments', () => {
			it('should consistently expose AppError in both environments', () => {
				const devEnv = createMockEnv('development');
				const prodEnv = createMockEnv('production');

				const error = new AppError('User input invalid', 'INVALID_INPUT', 400);

				const devResult = sanitizeError(error, devEnv);
				const prodResult = sanitizeError(error, prodEnv);

				// Both should expose the same AppError details
				expect(devResult.code).toBe('INVALID_INPUT');
				expect(prodResult.code).toBe('INVALID_INPUT');
				expect(devResult.message).toBe('User input invalid');
				expect(prodResult.message).toBe('User input invalid');
			});
		});
	});

	describe('securityHeaders middleware', () => {
		it('should set all required security headers', async () => {
			const app = new Hono();
			app.use('/*', securityHeaders());
			app.get('/test', (c) => c.text('OK'));

			const res = await app.request('/test');

			expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
			expect(res.headers.get('X-Frame-Options')).toBe('DENY');
			expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
			expect(res.headers.get('Content-Security-Policy')).toBe(
				"default-src 'self'",
			);
			expect(res.headers.get('Referrer-Policy')).toBe(
				'strict-origin-when-cross-origin',
			);
			expect(res.headers.get('Permissions-Policy')).toBe(
				'geolocation=(), microphone=(), camera=()',
			);
		});

		it('should apply headers to GET and POST routes', async () => {
			const app = new Hono();
			app.use('/*', securityHeaders());
			app.get('/api/v1/query', (c) => c.json({ test: true }));
			app.post('/api/v1/ingest', (c) => c.json({ test: true }));

			const getRes = await app.request('/api/v1/query');
			const postRes = await app.request('/api/v1/ingest', { method: 'POST' });

			expect(getRes.headers.get('X-Frame-Options')).toBe('DENY');
			expect(postRes.headers.get('X-Frame-Options')).toBe('DENY');
		});
	});
});
