/**
 * Corpus retrieval used by the Agents SDK retrieve tool (src/agents/rag-agent.ts).
 * Basic RAG (src/patterns/basic-rag.ts) uses the same helper for vector search.
 */

import type { Env, DocumentSource, EmbeddingResponse } from '../types';
import { EMBEDDING_MODEL } from '../config/models';
import { createDocumentStore } from './document-store';
import { createLogger } from './logger';
import { getCachedEmbedding, cacheEmbedding } from './embedding-cache';
import { sanitizeQuestion } from './validation';

export interface RetrievalResult {
  chunks: Array<{
    id: string;
    text: string;
    title: string;
    similarity: number;
  }>;
  sources: DocumentSource[];
  contextText: string;
}

export async function retrieveFromCorpus(
  query: string,
  env: Env,
  options?: {
    topK?: number;
    minSimilarity?: number;
    traceId?: string;
    spanId?: string;
  }
): Promise<RetrievalResult> {
  const logger = createLogger(
    {
      stage: 'retrieval',
      traceId: options?.traceId,
      spanId: options?.spanId,
    },
    env.LOG_LEVEL
  );

  const sanitized = sanitizeQuestion(query);

  if (sanitized.length > env.MAX_QUERY_LENGTH) {
    throw new Error(
      `Query exceeds maximum length of ${env.MAX_QUERY_LENGTH} characters`
    );
  }

  const topK = options?.topK ?? env.DEFAULT_TOP_K;

  let embedding = await getCachedEmbedding(sanitized, env, {
    loggerContext: { stage: 'embedding', traceId: options?.traceId },
  });

  if (!embedding) {
    const result = (await env.AI.run(
      EMBEDDING_MODEL,
      { text: [sanitized] },
      env.USE_AI_GATEWAY && env.AI_GATEWAY_ID
        ? { gateway: { id: env.AI_GATEWAY_ID } }
        : undefined
    )) as EmbeddingResponse;

    const freshEmbedding = result.data[0];
    if (!freshEmbedding?.length) {
      throw new Error('Failed to generate query embedding');
    }
    embedding = freshEmbedding;

    await cacheEmbedding(sanitized, embedding, env, {
      loggerContext: { stage: 'embedding', traceId: options?.traceId },
    });
  }

  const store = createDocumentStore(env, logger);
  const vectorMatches = await store.queryVectors(
    embedding,
    topK,
    options?.minSimilarity
  );

  if (vectorMatches.length === 0) {
    return {
      chunks: [],
      sources: [],
      contextText: 'No relevant documents found in the corpus.',
    };
  }

  const chunkIds = vectorMatches.map((m) => m.id);
  const chunks = await store.getChunksWithMetadata(chunkIds);

  const sources: DocumentSource[] = chunks.map((chunk) => {
    const match = vectorMatches.find((m) => m.id === chunk.id);
    return {
      documentId: chunk.documentId,
      chunkId: chunk.id,
      title: chunk.title,
      chunkText: chunk.text,
      chunkIndex: chunk.chunkIndex,
      similarity: match?.score ?? 0,
    };
  });

  const contextText = chunks
    .map((chunk, idx) => `[${idx + 1}] ${chunk.title}: ${chunk.text}`)
    .join('\n\n');

  return {
    chunks: chunks.map((chunk) => {
      const match = vectorMatches.find((m) => m.id === chunk.id);
      return {
        id: chunk.id,
        text: chunk.text,
        title: chunk.title,
        similarity: match?.score ?? 0,
      };
    }),
    sources,
    contextText,
  };
}
