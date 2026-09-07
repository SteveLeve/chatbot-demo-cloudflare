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
	articleIdForEval,
	extractModelText,
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

/** Cases per child `/eval/run` invocation — stays under Workers Free 50-subrequest cap. */
export const EVAL_BATCH_SIZE = 6;

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

	return extractModelText(result.response) || 'Unable to generate answer';
}

function average(scores: number[]): number {
	if (scores.length === 0) return 0;
	return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function naMetric(rationale: string): MetricScore {
	return { score: 0, rationale, passed: true };
}

function failedCase(options: {
	caseId: string;
	question: string;
	expectedBehavior: CaseEvalResult['expectedBehavior'];
	expectedArticleIds: string[];
	error: string;
	started: number;
	notes?: string;
}): CaseEvalResult {
	return {
		caseId: options.caseId,
		question: options.question,
		expectedBehavior: options.expectedBehavior,
		expectedArticleIds: options.expectedArticleIds,
		retrievedArticleIds: [],
		answer: '',
		refused: true,
		retrievalRelevance: {
			score: 0,
			rationale: `Case failed: ${options.error}`,
			passed: false,
		},
		faithfulness: {
			score: 0,
			rationale: `Case failed: ${options.error}`,
			passed: false,
		},
		groundedness: {
			score: 0,
			rationale: `Case failed: ${options.error}`,
			passed: false,
		},
		behaviorPass: false,
		overallPass: false,
		latencyMs: Date.now() - options.started,
		notes: options.notes,
		error: options.error,
	};
}

async function evaluateCase(env: Env, caseId: string): Promise<CaseEvalResult> {
	const goldCase = goldSet.cases.find((c) => c.id === caseId);
	if (!goldCase) {
		return failedCase({
			caseId,
			question: '',
			expectedBehavior: 'answer',
			expectedArticleIds: [],
			error: `Unknown gold case: ${caseId}`,
			started: Date.now(),
		});
	}

	const started = Date.now();
	let retrievedArticleIds: string[] = [];
	let answer = '';

	try {
		const retrieval = await retrieveFromCorpus(goldCase.question, env, {
			topK: goldSet.topK,
		});

		retrievedArticleIds = [
			...new Set(
				retrieval.sources.map((s) =>
					articleIdForEval({ articleId: s.articleId, title: s.title }),
				),
			),
		];

		const retrievalRelevance = scoreRetrievalRelevance({
			expectedArticleIds: goldCase.expectedArticleIds,
			retrievedArticleIds,
			expectedBehavior: goldCase.expectedBehavior,
		});

		answer = await generateAnswer(
			env,
			goldCase.question,
			retrieval.contextText,
		);
		const refused = isRefusalAnswer(answer);

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
		const retrievalRelevance = scoreRetrievalRelevance({
			expectedArticleIds: goldCase.expectedArticleIds,
			retrievedArticleIds,
			expectedBehavior: goldCase.expectedBehavior,
		});
		return {
			...failedCase({
				caseId: goldCase.id,
				question: goldCase.question,
				expectedBehavior: goldCase.expectedBehavior,
				expectedArticleIds: goldCase.expectedArticleIds,
				error: message,
				started,
				notes: goldCase.notes,
			}),
			retrievedArticleIds,
			answer,
			refused: isRefusalAnswer(answer),
			retrievalRelevance,
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

export function chunkCaseIds(ids: string[], size: number): string[][] {
	const batches: string[][] = [];
	for (let i = 0; i < ids.length; i += size) {
		batches.push(ids.slice(i, i + size));
	}
	return batches;
}

export function placeholderBatchReport(
	caseIds: string[],
	error: string,
): EvalReport {
	const started = Date.now();
	const cases = caseIds.map((caseId) => {
		const goldCase = goldSet.cases.find((c) => c.id === caseId);
		return failedCase({
			caseId,
			question: goldCase?.question ?? '',
			expectedBehavior: goldCase?.expectedBehavior ?? 'answer',
			expectedArticleIds: goldCase?.expectedArticleIds ?? [],
			error,
			started,
			notes: goldCase?.notes,
		});
	});
	return {
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
}

export function mergeEvalReports(reports: EvalReport[]): EvalReport {
	const cases = reports.flatMap((report) => report.cases);
	const latest = reports[reports.length - 1] ?? reports[0];
	if (!latest) {
		return placeholderBatchReport([], 'No eval batches returned');
	}
	return {
		...latest,
		generatedAt: new Date().toISOString(),
		source: 'live',
		aggregates: buildAggregates(cases),
		cases,
	};
}

export async function runEvalReport(
	env: Env,
	options?: { caseIds?: string[] },
): Promise<EvalReport> {
	const logger = createLogger({ stage: 'eval-run' }, env.LOG_LEVEL);
	const caseIds =
		options?.caseIds && options.caseIds.length > 0
			? options.caseIds
			: goldSet.cases.map((c) => c.id);

	logger.info('Starting demo-scale eval run', { cases: caseIds.length });

	const cases = await mapPool(caseIds, CONCURRENCY, (id) =>
		evaluateCase(env, id),
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
