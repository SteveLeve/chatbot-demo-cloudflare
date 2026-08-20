import { describe, it, expect, vi } from 'vitest';
import {
	embeddingCacheKey,
	getCachedEmbedding,
	cacheEmbedding,
} from '../../src/utils/embedding-cache';
import { EMBEDDING_MODEL } from '../../src/config/models';
import type { Env } from '../../src/types';

function mockEnv(cache: {
	get: ReturnType<typeof vi.fn>;
	put: ReturnType<typeof vi.fn>;
}): Env {
	return {
		EMBEDDINGS_CACHE: cache,
		LOG_LEVEL: 'ERROR',
	} as unknown as Env;
}

describe('embeddingCacheKey', () => {
	it('namespaces the key by embedding model so a later swap cannot collide', async () => {
		const key = await embeddingCacheKey('What is AI?');
		expect(key.startsWith(`emb:${EMBEDDING_MODEL}:`)).toBe(true);
		expect(key).not.toMatch(/^emb:[^@]/);
	});

	it('is stable for the same text', async () => {
		const a = await embeddingCacheKey('same query');
		const b = await embeddingCacheKey('same query');
		expect(a).toBe(b);
	});
});

describe('getCachedEmbedding / cacheEmbedding', () => {
	it('reads and writes using the model-namespaced key', async () => {
		const stored = [0.1, 0.2, 0.3];
		const get = vi.fn().mockResolvedValue(stored);
		const put = vi.fn().mockResolvedValue(undefined);
		const env = mockEnv({ get, put });
		const expectedKey = await embeddingCacheKey('hello');

		const hit = await getCachedEmbedding('hello', env);
		expect(hit).toEqual(stored);
		expect(get).toHaveBeenCalledWith(expectedKey, 'json');

		await cacheEmbedding('hello', stored, env);
		expect(put).toHaveBeenCalledWith(
			expectedKey,
			JSON.stringify(stored),
			expect.objectContaining({ expirationTtl: expect.any(Number) }),
		);
	});
});
