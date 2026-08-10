/**
 * Demo-scale eval runner (Phase 4 / #35).
 * Uses basic-rag generate path (cheaper than DO agent loop) + hybrid metrics.
 */

import type { Env, GenerationResponse } from '../types';
import { GENERATION_MODEL } from '../config/models';
import { retrieveFromCorpus } from '../utils/retrieval';
import { createLogger } from '../utils/logger';
import goldSetJson from '../../data/eval/gold-set.json';
import {
	DEFAULT_METRIC_EXPLAINER,
	isRefusalAnswer,
	judgeAnswer,
	scoreBehavior,
	scoreRetrievalRelevance,
} from './metrics';
import type {
	CaseEvalResult,
	EvalAggregates,
	EvalGoldSet,
	EvalReport,
	MetricScore,
} from './types';

const goldSet = goldSetJson as EvalGoldSet;

const CONCURRENCY = 2;

function buildGeneratePrompt(context: string): string {
	return `You are a strict document retrieval system. You have ZERO knowledge beyond what appears in the context below.

<CONTEXT>
${context}
</CONTEXT>

CRITICAL RULES:
1. You ONLY know information within the <CONTEXT> tags above.
2. If the context does not contain the answer, respond: "I cannot answer this question based on the provided documents."
3. Cite sources with [N] when answering.
4. Do not invent facts outside the context.`;
}

async function generateAnswer(
	env: Env,
	question: string,
	contextText: string,
): Promise<string> {
	const result = (await env.AI.run(
		GENERATION_MODEL,
		{
			messages: [
				{ role: 'system', content: buildGeneratePrompt(contextText) },
				{ role: 'user', content: question },
			],
			temperature: 0,
			max_tokens: 512,
		},
		env.USE_AI_GATEWAY && env.AI_GATEWAY_ID
			? { gateway: { id: env.AI_GATEWAY_ID } }
			: undefined,
	)) as GenerationResponse;

	return result.response || 'Unable to generate answer';
}

function average(scores: number[]): number {
	if (scores.length === 0) return 0;
	return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function naMetric(rationale: string): MetricScore {
	return { score: 0, rationale, passed: true };
}

async function evaluateCase(env: Env, caseId: string): Promise<CaseEvalResult> {
	const goldCase = goldSet.cases.find((c) => c.id === caseId);
	if (!goldCase) {
		throw new Error(`Unknown gold case: ${caseId}`);
	}

	const started = Date.now();

	try {
		const retrieval = await retrieveFromCorpus(goldCase.question, env, {
			topK: goldSet.topK,
		});

		const retrievedArticleIds = [
			...new Set(retrieval.sources.map((s) => s.documentId)),
		];

		const answer = await generateAnswer(
			env,
			goldCase.question,
			retrieval.contextText,
		);
		const refused = isRefusalAnswer(answer);

		const retrievalRelevance = scoreRetrievalRelevance({
			expectedArticleIds: goldCase.expectedArticleIds,
			retrievedArticleIds,
			expectedBehavior: goldCase.expectedBehavior,
		});

		const behavior = scoreBehavior({
			expectedBehavior: goldCase.expectedBehavior,
			refused,
		});

		let faithfulness: MetricScore | null = null;
		let groundedness: MetricScore | null = null;

		if (goldCase.expectedBehavior === 'refuse') {
			faithfulness = naMetric(
				'Skipped LLM judge for refuse case — behavior check is primary.',
			);
			groundedness = naMetric(
				'Skipped LLM judge for refuse case — behavior check is primary.',
			);
		} else if (refused) {
			faithfulness = {
				score: 0,
				rationale:
					'Model refused; faithfulness scored 0 for expected-answer case.',
				passed: false,
			};
			groundedness = {
				score: 0,
				rationale:
					'Model refused; groundedness scored 0 for expected-answer case.',
				passed: false,
			};
		} else {
			const judged = await judgeAnswer(env, {
				question: goldCase.question,
				answer,
				contextText: retrieval.contextText,
			});
			faithfulness = judged.faithfulness;
			groundedness = judged.groundedness;
		}

		const overallPass =
			behavior.passed &&
			retrievalRelevance.passed &&
			(faithfulness?.passed ?? true) &&
			(groundedness?.passed ?? true);

		return {
			caseId: goldCase.id,
			question: goldCase.question,
			expectedBehavior: goldCase.expectedBehavior,
			expectedArticleIds: goldCase.expectedArticleIds,
			retrievedArticleIds,
			answer,
			refused,
			retrievalRelevance,
			faithfulness,
			groundedness,
			behaviorPass: behavior.passed,
			overallPass,
			latencyMs: Date.now() - started,
			notes: goldCase.notes
				? `${goldCase.notes} | ${behavior.rationale}`
				: behavior.rationale,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return {
			caseId: goldCase.id,
			question: goldCase.question,
			expectedBehavior: goldCase.expectedBehavior,
			expectedArticleIds: goldCase.expectedArticleIds,
			retrievedArticleIds: [],
			answer: '',
			refused: true,
			retrievalRelevance: {
				score: 0,
				rationale: `Case failed: ${message}`,
				passed: false,
			},
			faithfulness: {
				score: 0,
				rationale: `Case failed: ${message}`,
				passed: false,
			},
			groundedness: {
				score: 0,
				rationale: `Case failed: ${message}`,
				passed: false,
			},
			behaviorPass: false,
			overallPass: false,
			latencyMs: Date.now() - started,
			notes: goldCase.notes,
			error: message,
		};
	}
}

async function mapPool<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;

	async function worker() {
		while (next < items.length) {
			const i = next++;
			const item = items[i];
			if (item === undefined) return;
			results[i] = await fn(item);
		}
	}

	const workers = Array.from(
		{ length: Math.min(concurrency, items.length) },
		() => worker(),
	);
	await Promise.all(workers);
	return results;
}

function buildAggregates(cases: CaseEvalResult[]): EvalAggregates {
	const passCount = cases.filter((c) => c.overallPass).length;
	const faithScores = cases
		.filter((c) => c.expectedBehavior === 'answer' && c.faithfulness)
		.map((c) => c.faithfulness!.score);
	const groundScores = cases
		.filter((c) => c.expectedBehavior === 'answer' && c.groundedness)
		.map((c) => c.groundedness!.score);

	return {
		caseCount: cases.length,
		passCount,
		failCount: cases.length - passCount,
		retrievalRelevance: average(cases.map((c) => c.retrievalRelevance.score)),
		faithfulness: average(faithScores),
		groundedness: average(groundScores),
		behaviorPassRate: average(cases.map((c) => (c.behaviorPass ? 1 : 0))),
	};
}

export function getGoldSet(): EvalGoldSet {
	return goldSet;
}

export async function runEvalReport(env: Env): Promise<EvalReport> {
	const logger = createLogger({ stage: 'eval-run' }, env.LOG_LEVEL);
	logger.info('Starting demo-scale eval run', { cases: goldSet.cases.length });

	const cases = await mapPool(goldSet.cases, CONCURRENCY, (c) =>
		evaluateCase(env, c.id),
	);

	const report: EvalReport = {
		demoScale: true,
		generatedAt: new Date().toISOString(),
		source: 'live',
		scoredPath: 'basic-rag',
		generationModel: GENERATION_MODEL,
		goldSetVersion: goldSet.version,
		methodologyLimits: goldSet.methodologyLimits,
		aggregates: buildAggregates(cases),
		cases,
		metricExplainer: {
			retrievalRelevance: { ...DEFAULT_METRIC_EXPLAINER.retrievalRelevance },
			faithfulness: { ...DEFAULT_METRIC_EXPLAINER.faithfulness },
			groundedness: { ...DEFAULT_METRIC_EXPLAINER.groundedness },
		},
	};

	logger.info('Eval run complete', {
		passCount: report.aggregates.passCount,
		failCount: report.aggregates.failCount,
	});

	return report;
}
