/**
 * Testable retrieve-tool logic for RAGAgent.
 */

import type { Env, DocumentSource } from '../types';
import type { RetrieveTraceDetail } from '../types/trace';
import { retrieveFromCorpus } from '../utils/retrieval';

export interface RetrieveToolHandlers {
  onRetrieveStart: (summary: string) => void;
  onRetrieveEmpty: (query: string) => void;
  onRetrieveHit: (detail: RetrieveTraceDetail) => void;
}

export async function runRetrieveFromCorpusTool(
  query: string,
  topK: number,
  env: Env,
  handlers: RetrieveToolHandlers,
  traceContext?: { traceId?: string; spanId?: string }
): Promise<{
  contextText: string;
  sources: DocumentSource[];
  chunkCount: number;
}> {
  handlers.onRetrieveStart(
    `Retrieving chunks for "${query.slice(0, 80)}${query.length > 80 ? '…' : ''}"`
  );

  const result = await retrieveFromCorpus(query, env, {
    topK,
    traceId: traceContext?.traceId,
    spanId: traceContext?.spanId,
  });

  if (result.chunks.length === 0) {
    handlers.onRetrieveEmpty(query);
  } else {
    handlers.onRetrieveHit({
      titles: result.chunks.map((c) => c.title),
      scores: result.chunks.map((c) => c.similarity),
      chunkIds: result.chunks.map((c) => c.id),
    });
  }

  return {
    contextText: result.contextText,
    sources: result.sources,
    chunkCount: result.chunks.length,
  };
}
