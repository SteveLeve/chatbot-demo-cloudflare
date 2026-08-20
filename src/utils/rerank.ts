/**
 * Cross-encoder rerank for the Agents SDK retrieve path (#21).
 * Not used by basic-rag, eval, or red-team live-try.
 */

import type { Env } from '../types';
import { RERANKER_MODEL } from '../config/models';
import { createLogger } from './logger';

/** Vectorize candidates fetched before keeping `topK` after rerank. */
export const RERANK_CANDIDATE_K = 10;

export interface RerankableChunk {
	id: string;
	text: string;
	title: string;
	similarity: number;
}

export interface RerankResult<T extends RerankableChunk> {
	chunks: T[];
	scores: number[];
	fallback: boolean;
}

type RerankerOutput = {
	response?: Array<{ id?: number; score?: number }>;
};

/**
 * When the reranker call fails, fall back to Vectorize order so retrieve
 * still returns chunks. The tool traces this via `fallback: true`.
 *
 * Alternative: rethrow so the tool call fails and the agent may refuse.
 * Fallback is the better demo default — a reranker outage should not
 * blank the corpus.
 */
export function onRerankFailure<T>(chunks: T[], keep: number): T[] {
	return chunks.slice(0, keep);
}

export async function rerankChunks<T extends RerankableChunk>(
	query: string,
	chunks: T[],
	env: Env,
	options: { keep: number },
): Promise<RerankResult<T>> {
	const keep = Math.max(1, options.keep);
	const logger = createLogger({ stage: 'rerank' }, env.LOG_LEVEL);

	if (chunks.length <= 1) {
		return {
			chunks,
			scores: chunks.map((c) => c.similarity),
			fallback: false,
		};
	}

	try {
		// Generated Workers types omit `query` on the reranker input; it is
		// required at runtime (see Cloudflare bge-reranker-base docs).
		const inputs = {
			query,
			contexts: chunks.map((chunk) => ({ text: chunk.text })),
			top_k: keep,
		} as Ai_Cf_Baai_Bge_Reranker_Base_Input;

		const result = (await env.AI.run(
			RERANKER_MODEL,
			inputs,
			env.USE_AI_GATEWAY && env.AI_GATEWAY_ID
				? { gateway: { id: env.AI_GATEWAY_ID } }
				: undefined,
		)) as RerankerOutput;

		const ranked = (result.response ?? [])
			.filter(
				(row): row is { id: number; score?: number } =>
					typeof row.id === 'number' && row.id >= 0 && row.id < chunks.length,
			)
			.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
			.slice(0, keep);

		const selected = ranked
			.map((row) => chunks[row.id])
			.filter((chunk): chunk is T => chunk !== undefined);

		if (selected.length === 0) {
			logger.warn('Reranker returned no usable indexes; using Vectorize order');
			return {
				chunks: onRerankFailure(chunks, keep),
				scores: [],
				fallback: true,
			};
		}

		return {
			chunks: selected,
			scores: ranked.map((row) => row.score ?? 0),
			fallback: false,
		};
	} catch (error) {
		logger.warn('Rerank failed; using Vectorize order', { error });
		return {
			chunks: onRerankFailure(chunks, keep),
			scores: [],
			fallback: true,
		};
	}
}
