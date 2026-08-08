import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retrieveFromCorpus } from '../../src/utils/retrieval';

function createMockEnv(): import('../../src/types').Env {
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
    RAG_AGENT: {} as DurableObjectNamespace,
    ASSETS: {} as Fetcher,
    QUERY_RATE_LIMITER: {} as RateLimit,
    INGEST_RATE_LIMITER: {} as RateLimit,
    CHAT_LOG_IP_SALT: 'test-salt',
    ENVIRONMENT: 'test',
    LOG_LEVEL: 'ERROR',
    ENABLE_TEXT_SPLITTING: true,
    DEFAULT_CHUNK_SIZE: 500,
    DEFAULT_CHUNK_OVERLAP: 100,
    DEFAULT_TOP_K: 3,
    MAX_QUERY_LENGTH: 500,
    USE_AI_GATEWAY: false,
  };
}

describe('retrieveFromCorpus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty result when vector search finds no matches', async () => {
    const env = createMockEnv();

    vi.spyOn(
      await import('../../src/utils/embedding-cache'),
      'getCachedEmbedding'
    ).mockResolvedValue([0.1, 0.2, 0.3]);

    const { createDocumentStore } = await import('../../src/utils/document-store');
    vi.spyOn(
      await import('../../src/utils/document-store'),
      'createDocumentStore'
    ).mockReturnValue({
      queryVectors: vi.fn().mockResolvedValue([]),
      getChunksWithMetadata: vi.fn(),
    } as unknown as ReturnType<typeof createDocumentStore>);

    const result = await retrieveFromCorpus('What is AI?', env);

    expect(result.chunks).toHaveLength(0);
    expect(result.sources).toHaveLength(0);
    expect(result.contextText).toContain('No relevant documents');
  });
});
