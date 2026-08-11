import { describe, it, expect, vi } from 'vitest';
import {
	deterministicDocumentId,
	deterministicChunkId,
	withTimeout,
} from '../../src/utils/ingestion-ids';

describe('ingestion-ids', () => {
	it('generates stable document and chunk ids from articleId', () => {
		expect(deterministicDocumentId('wiki-42')).toBe('doc-wiki-42');
		expect(deterministicChunkId('wiki-42', 0)).toBe('chunk-wiki-42-0');
		expect(deterministicChunkId('wiki-42', 3)).toBe('chunk-wiki-42-3');
	});

	it('withTimeout resolves when promise completes in time', async () => {
		await expect(withTimeout(Promise.resolve('ok'), 100, 'test')).resolves.toBe(
			'ok',
		);
	});

	it('withTimeout rejects when promise exceeds limit', async () => {
		vi.useFakeTimers();
		const slow = new Promise<string>((resolve) => {
			setTimeout(() => resolve('late'), 50);
		});
		const assertion = expect(
			withTimeout(slow, 10, 'embedding-batch'),
		).rejects.toThrow('embedding-batch timed out after 10ms');
		await vi.advanceTimersByTimeAsync(15);
		await assertion;
		vi.useRealTimers();
	});
});
