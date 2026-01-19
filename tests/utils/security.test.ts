import { describe, it, expect } from 'vitest';
import { getCorsConfig, sanitizeError } from '../../src/utils/security';
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

			expect(config.origin).toEqual(['http://localhost:3000', 'http://localhost:8787']);
			expect(config.allowMethods).toEqual(['GET', 'POST']);
			expect(config.credentials).toBe(true);
		});

		it('should return production domain for production environment', () => {
			const env = createMockEnv('production');
			const config = getCorsConfig(env);

			expect(config.origin).toBe('https://cloudflare-rag-demo.stevenleve.com');
			expect(config.allowMethods).toEqual(['GET', 'POST']);
			expect(config.credentials).toBe(true);
		});

		it('should default to production if environment is not set', () => {
			const env = { ...createMockEnv('production'), ENVIRONMENT: '' };
			const config = getCorsConfig(env);

			expect(config.origin).toBe('https://cloudflare-rag-demo.stevenleve.com');
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
				expect(result.details?.stack).toBe('Stack trace here');
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
				expect(result.details?.raw).toEqual(error);
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
				expect(result.message).toBe('An internal error occurred. Please try again later.');
				expect(result.details).toBeUndefined();
			});

			it('should expose AppError details in production', () => {
				const error = new AppError('Validation failed', 'VALIDATION_ERROR', 400);
				const result = sanitizeError(error, env);

				expect(result.code).toBe('VALIDATION_ERROR');
				expect(result.message).toBe('Validation failed');
			});

			it('should return generic error for non-Error objects', () => {
				const error = { sensitive: 'data' };
				const result = sanitizeError(error, env);

				expect(result.code).toBe('INTERNAL_ERROR');
				expect(result.message).toBe('An internal error occurred. Please try again later.');
				expect(result.details).toBeUndefined();
			});

			it('should return generic error for string errors', () => {
				const error = 'Database connection string: postgres://...';
				const result = sanitizeError(error, env);

				expect(result.code).toBe('INTERNAL_ERROR');
				expect(result.message).toBe('An internal error occurred. Please try again later.');
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
					expect(result.message).toBe('An internal error occurred. Please try again later.');
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
		// Note: Testing middleware requires a Hono context mock
		// This is a placeholder for integration testing
		it('should be tested in integration tests', () => {
			// Security headers middleware is tested via integration tests
			// that verify actual HTTP response headers
			expect(true).toBe(true);
		});
	});
});
