/**
 * Testable retrieve-tool logic for RAGAgent.
 */

import type { Env, DocumentSource } from '../types';
import type { RetrieveTraceDetail } from '../types/trace';
import { retrieveFromCorpus, formatContextText } from '../utils/retrieval';
import { RERANK_CANDIDATE_K, rerankChunks } from '../utils/rerank';

export interface RetrieveToolHandlers {
	onRetrieveStart: (summary: string) => void;
	onRetrieveEmpty: (query: string) => void;
	onRetrieveHit: (detail: RetrieveTraceDetail) => void;
	onRerankComplete: (detail: RetrieveTraceDetail) => void;
}

export async function runRetrieveFromCorpusTool(
	query: string,
	topK: number,
	env: Env,
	handlers: RetrieveToolHandlers,
	traceContext?: { traceId?: string; spanId?: string },
): Promise<{
	contextText: string;
	sources: DocumentSource[];
	chunkCount: number;
}> {
	handlers.onRetrieveStart(
		`Retrieving chunks for "${query.slice(0, 80)}${query.length > 80 ? '…' : ''}"`,
	);

	const keep = topK;
	const candidateK = Math.max(keep, RERANK_CANDIDATE_K);
	const result = await retrieveFromCorpus(query, env, {
		topK: candidateK,
		traceId: traceContext?.traceId,
		spanId: traceContext?.spanId,
	});

	if (result.chunks.length === 0) {
		handlers.onRetrieveEmpty(query);
		return {
			contextText: result.contextText,
			sources: result.sources,
			chunkCount: 0,
		};
	}

	handlers.onRetrieveHit({
		titles: result.chunks.map((c) => c.title),
		scores: result.chunks.map((c) => c.similarity),
		chunkIds: result.chunks.map((c) => c.id),
		candidateCount: result.chunks.length,
	});

	const ranked = await rerankChunks(query, result.chunks, env, { keep });
	const sources = ranked.chunks
		.map((chunk) =>
			result.sources.find((source) => source.chunkId === chunk.id),
		)
		.filter((source): source is DocumentSource => source !== undefined);

	handlers.onRerankComplete({
		titles: ranked.chunks.map((c) => c.title),
		scores: ranked.chunks.map((c) => c.similarity),
		chunkIds: ranked.chunks.map((c) => c.id),
		rerankScores: ranked.scores,
		candidateCount: result.chunks.length,
		fallback: ranked.fallback,
	});

	return {
		contextText: formatContextText(ranked.chunks),
		sources,
		chunkCount: ranked.chunks.length,
	};
}
