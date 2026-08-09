import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retrieveFromCorpus } from '../../src/utils/retrieval';
import { runRetrieveFromCorpusTool } from '../../src/agents/rag-agent-tools';
import type { DocumentStore } from '../../src/utils/document-store';
import type { Env } from '../../src/types';

function createMockEnv(): Env {
	return {
		AI: {
			run: vi.fn(),
		} as unknown as Ai,
		DATABASE: {} as D1Database,
		VECTOR_INDEX: {} as VectorizeIndex,
		ARTICLES_BUCKET: {} as R2Bucket,
		EMBEDDINGS_CACHE: {
			get: vi.fn().mockResolvedValue(null),
			put: vi.fn().mockResolvedValue(undefined),
		} as unknown as KVNamespace,
		RAG_CACHE: {} as KVNamespace,
		INGESTION_WORKFLOW: {} as Workflow,
		RAG_AGENT: {} as DurableObjectNamespace<
			import('../../src/agents/rag-agent').RAGAgent
		>,
		ASSETS: {} as Fetcher,
		QUERY_RATE_LIMITER: {} as RateLimit,
		INGEST_RATE_LIMITER: {} as RateLimit,
		CHAT_LOG_IP_SALT: 'test-salt',
		CHAT_LOGGING_ENABLED: true,
		ENVIRONMENT: 'test',
		LOG_LEVEL: 'ERROR',
		ENABLE_TEXT_SPLITTING: true,
		DEFAULT_CHUNK_SIZE: 500,
		DEFAULT_CHUNK_OVERLAP: 100,
		DEFAULT_TOP_K: 3,
		MAX_QUERY_LENGTH: 500,
		USE_AI_GATEWAY: false,
	} as Env;
}

describe('retrieveFromCorpus', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns empty result when vector search finds no matches', async () => {
		const env = createMockEnv();

		vi.spyOn(
			await import('../../src/utils/embedding-cache'),
			'getCachedEmbedding',
		).mockResolvedValue([0.1, 0.2, 0.3]);

		vi.spyOn(
			await import('../../src/utils/document-store'),
			'createDocumentStore',
		).mockReturnValue({
			queryVectors: vi.fn().mockResolvedValue([]),
			getChunksWithMetadata: vi.fn(),
		} as unknown as DocumentStore);

		const result = await retrieveFromCorpus('What is AI?', env);

		expect(result.chunks).toHaveLength(0);
		expect(result.sources).toHaveLength(0);
		expect(result.contextText).toContain('No relevant documents');
	});

	it('returns chunks when vector search matches', async () => {
		const env = createMockEnv();

		vi.spyOn(
			await import('../../src/utils/embedding-cache'),
			'getCachedEmbedding',
		).mockResolvedValue([0.1, 0.2, 0.3]);

		vi.spyOn(
			await import('../../src/utils/document-store'),
			'createDocumentStore',
		).mockReturnValue({
			queryVectors: vi.fn().mockResolvedValue([{ id: 'chunk-1', score: 0.92 }]),
			getChunksWithMetadata: vi.fn().mockResolvedValue([
				{
					id: 'chunk-1',
					documentId: 'doc-1',
					text: 'AI is intelligence demonstrated by machines.',
					chunkIndex: 0,
					title: 'Artificial intelligence',
					articleId: 'artificial-intelligence',
					documentMetadata: {},
					metadata: {},
					createdAt: 0,
				},
			]),
		} as unknown as DocumentStore);

		const result = await retrieveFromCorpus('What is AI?', env);

		expect(result.chunks).toHaveLength(1);
		expect(result.sources[0]?.title).toBe('Artificial intelligence');
		expect(result.contextText).toContain('Artificial intelligence');
	});

	it('throws when embedding generation fails', async () => {
		const env = createMockEnv();
		env.AI.run = vi.fn().mockResolvedValue({ data: [] });

		vi.spyOn(
			await import('../../src/utils/embedding-cache'),
			'getCachedEmbedding',
		).mockResolvedValue(null);

		await expect(retrieveFromCorpus('What is AI?', env)).rejects.toThrow(
			'Failed to generate query embedding',
		);
	});

	it('rejects queries longer than MAX_QUERY_LENGTH', async () => {
		const env = createMockEnv();
		const longQuery = 'a'.repeat(env.MAX_QUERY_LENGTH + 1);

		await expect(retrieveFromCorpus(longQuery, env)).rejects.toThrow(
			'Query exceeds maximum length',
		);
	});
});

describe('runRetrieveFromCorpusTool', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('fires guard handler when retrieval is empty', async () => {
		const env = createMockEnv();
		const handlers = {
			onRetrieveStart: vi.fn(),
			onRetrieveEmpty: vi.fn(),
			onRetrieveHit: vi.fn(),
		};

		vi.spyOn(
			await import('../../src/utils/embedding-cache'),
			'getCachedEmbedding',
		).mockResolvedValue([0.1]);

		vi.spyOn(
			await import('../../src/utils/document-store'),
			'createDocumentStore',
		).mockReturnValue({
			queryVectors: vi.fn().mockResolvedValue([]),
			getChunksWithMetadata: vi.fn(),
		} as unknown as DocumentStore);

		const result = await runRetrieveFromCorpusTool(
			'unknown topic',
			3,
			env,
			handlers,
		);

		expect(handlers.onRetrieveStart).toHaveBeenCalledOnce();
		expect(handlers.onRetrieveEmpty).toHaveBeenCalledWith('unknown topic');
		expect(handlers.onRetrieveHit).not.toHaveBeenCalled();
		expect(result.chunkCount).toBe(0);
	});

	it('fires hit handler when retrieval returns chunks', async () => {
		const env = createMockEnv();
		const handlers = {
			onRetrieveStart: vi.fn(),
			onRetrieveEmpty: vi.fn(),
			onRetrieveHit: vi.fn(),
		};

		vi.spyOn(
			await import('../../src/utils/embedding-cache'),
			'getCachedEmbedding',
		).mockResolvedValue([0.1]);

		vi.spyOn(
			await import('../../src/utils/document-store'),
			'createDocumentStore',
		).mockReturnValue({
			queryVectors: vi.fn().mockResolvedValue([{ id: 'c1', score: 0.9 }]),
			getChunksWithMetadata: vi.fn().mockResolvedValue([
				{
					id: 'c1',
					documentId: 'd1',
					text: 'Chunk text',
					chunkIndex: 0,
					title: 'Title',
					articleId: 'title',
					documentMetadata: {},
					metadata: {},
					createdAt: 0,
				},
			]),
		} as unknown as DocumentStore);

		const result = await runRetrieveFromCorpusTool(
			'What is AI?',
			3,
			env,
			handlers,
		);

		expect(handlers.onRetrieveHit).toHaveBeenCalledOnce();
		expect(handlers.onRetrieveEmpty).not.toHaveBeenCalled();
		expect(result.chunkCount).toBe(1);
		expect(result.sources).toHaveLength(1);
	});
});
