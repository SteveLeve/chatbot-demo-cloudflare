import { describe, it, expect, vi } from 'vitest';
import {
	onRerankFailure,
	rerankChunks,
	type RerankableChunk,
} from '../../src/utils/rerank';
import { RERANKER_MODEL } from '../../src/config/models';
import type { Env } from '../../src/types';

function chunk(id: string, text: string, similarity = 0.5): RerankableChunk {
	return { id, text, title: id, similarity };
}

function mockEnv(run: ReturnType<typeof vi.fn>): Env {
	return {
		AI: { run } as unknown as Ai,
		USE_AI_GATEWAY: false,
		LOG_LEVEL: 'ERROR',
	} as unknown as Env;
}

describe('onRerankFailure', () => {
	it('keeps Vectorize order truncated to keep-N', () => {
		const chunks = [chunk('a', 'A'), chunk('b', 'B'), chunk('c', 'C')];
		expect(onRerankFailure(chunks, 2).map((c) => c.id)).toEqual(['a', 'b']);
	});
});

describe('rerankChunks', () => {
	it('returns identity for a single chunk without calling the model', async () => {
		const run = vi.fn();
		const result = await rerankChunks(
			'query',
			[chunk('a', 'only')],
			mockEnv(run),
			{ keep: 3 },
		);

		expect(run).not.toHaveBeenCalled();
		expect(result.fallback).toBe(false);
		expect(result.chunks).toHaveLength(1);
	});

	it('reorders by reranker scores and keeps N', async () => {
		const run = vi.fn().mockResolvedValue({
			response: [
				{ id: 0, score: 0.1 },
				{ id: 1, score: 0.9 },
				{ id: 2, score: 0.5 },
			],
		});
		const chunks = [
			chunk('weak', 'weak text'),
			chunk('strong', 'strong text'),
			chunk('mid', 'mid text'),
		];

		const result = await rerankChunks('query', chunks, mockEnv(run), {
			keep: 2,
		});

		expect(run).toHaveBeenCalledWith(
			RERANKER_MODEL,
			expect.objectContaining({
				query: 'query',
				top_k: 2,
			}),
			undefined,
		);
		expect(result.fallback).toBe(false);
		expect(result.chunks.map((c) => c.id)).toEqual(['strong', 'mid']);
		expect(result.scores).toEqual([0.9, 0.5]);
	});

	it('falls back to Vectorize order when the model throws', async () => {
		const run = vi.fn().mockRejectedValue(new Error('reranker down'));
		const chunks = [chunk('a', 'A', 0.9), chunk('b', 'B', 0.8)];

		const result = await rerankChunks('query', chunks, mockEnv(run), {
			keep: 1,
		});

		expect(result.fallback).toBe(true);
		expect(result.chunks.map((c) => c.id)).toEqual(['a']);
	});

	it('falls back when the model returns no usable indexes', async () => {
		const run = vi.fn().mockResolvedValue({ response: [{ id: 99, score: 1 }] });
		const chunks = [chunk('a', 'A'), chunk('b', 'B')];

		const result = await rerankChunks('query', chunks, mockEnv(run), {
			keep: 1,
		});

		expect(result.fallback).toBe(true);
		expect(result.chunks.map((c) => c.id)).toEqual(['a']);
	});
});
