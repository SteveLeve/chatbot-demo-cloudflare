import type { Env } from '../types';
import { createLogger } from './logger';

const WEEK_IN_SECONDS = 7 * 24 * 60 * 60;

async function hashText(text: string): Promise<string> {
	const data = new TextEncoder().encode(text);
	const digest = await crypto.subtle.digest('SHA-256', data);
	const bytes = new Uint8Array(digest);
	// Convert to base64url without padding
	const base64 = btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
	return base64;
}

export async function getCachedEmbedding(
	text: string,
	env: Env,
	options?: { loggerContext?: Record<string, any> }
): Promise<number[] | null> {
	const logger = createLogger({ cache: 'embeddings', ...(options?.loggerContext || {}) }, env.LOG_LEVEL);
	if (!env.EMBEDDINGS_CACHE) {
		logger.debug('Embeddings cache missing binding, skipping');
		return null;
	}

	const cacheKey = `emb:${await hashText(text)}`;
	const start = Date.now();

	try {
		const cached = await env.EMBEDDINGS_CACHE.get<number[]>(cacheKey, 'json');
		const latencyMs = Date.now() - start;
		logger.info('Embedding cache lookup', { cacheHit: !!cached, cacheKeyPrefix: cacheKey.slice(0, 12), cacheLatencyMs: latencyMs });
		return cached || null;
	} catch (error) {
		logger.warn('Embedding cache read failed, falling back', { cacheKeyPrefix: cacheKey.slice(0, 12), cacheError: true, error });
		return null;
	}
}

export async function cacheEmbedding(
	text: string,
	embedding: number[],
	env: Env,
	options?: { loggerContext?: Record<string, any> }
): Promise<void> {
	const logger = createLogger({ cache: 'embeddings', ...(options?.loggerContext || {}) }, env.LOG_LEVEL);
	if (!env.EMBEDDINGS_CACHE) {
		logger.debug('Embeddings cache missing binding, skipping write');
		return;
	}

	const cacheKey = `emb:${await hashText(text)}`;
	try {
		await env.EMBEDDINGS_CACHE.put(cacheKey, JSON.stringify(embedding), { expirationTtl: WEEK_IN_SECONDS });
		logger.debug('Embedding cached', { cacheKeyPrefix: cacheKey.slice(0, 12) });
	} catch (error) {
		logger.warn('Embedding cache write failed (non-fatal)', { cacheKeyPrefix: cacheKey.slice(0, 12), cacheError: true, error });
	}
}

