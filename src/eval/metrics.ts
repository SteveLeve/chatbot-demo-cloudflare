/**
 * Hybrid demo-scale metrics:
 * - retrieval relevance: deterministic Hit@K / recall vs expected article IDs
 * - faithfulness & groundedness: LLM-as-judge (parsed JSON)
 */

import type { Env, GenerationResponse } from '../types';
import { GENERATION_MODEL } from '../config/models';
import type { MetricScore } from './types';

/** Demo pass threshold — intentionally modest; teaching not ranking. */
export const DEMO_PASS_THRESHOLD = 0.6;

const REFUSAL_PATTERNS = [
	/i cannot answer/i,
	/i don't have enough information/i,
	/i do not have enough information/i,
	/not (enough|sufficient) information/i,
	/based on the (available|provided) documents/i,
	/not in (the )?corpus/i,
	/outside (of )?the (curated )?corpus/i,
	/no relevant (documents|information)/i,
];

export function isRefusalAnswer(answer: string): boolean {
	const trimmed = answer.trim();
	if (!trimmed) return true;
	return REFUSAL_PATTERNS.some((re) => re.test(trimmed));
}

/**
 * Deterministic retrieval relevance over expected article IDs.
 * Hit@K = 1 if any expected id appears in retrieved top-K; recall = |∩| / |expected|.
 * Combined score = average of hit and recall (refuse cases with empty expected → 1 when no hits).
 */
export function scoreRetrievalRelevance(options: {
	expectedArticleIds: string[];
	retrievedArticleIds: string[];
	expectedBehavior: 'answer' | 'refuse';
}): MetricScore {
	const expected = [...new Set(options.expectedArticleIds)];
	const retrieved = [...new Set(options.retrievedArticleIds)];

	if (options.expectedBehavior === 'refuse' && expected.length === 0) {
		const hitUnexpected = retrieved.length > 0;
		// For refuse cases we still retrieve; low/empty expected means success if we don't require hits.
		// Score 1 when we correctly have no expected grounding targets (out-of-corpus).
		return {
			score: 1,
			rationale: hitUnexpected
				? `Out-of-corpus case: retrieval returned ${retrieved.length} article(s); expected none. Retrieval relevance is N/A for grounding targets — scored 1 for empty expected set.`
				: 'Out-of-corpus case: no expected articles; retrieval empty as expected.',
			passed: true,
		};
	}

	if (expected.length === 0) {
		return {
			score: 0,
			rationale: 'Answer case has no expectedArticleIds configured.',
			passed: false,
		};
	}

	const intersection = expected.filter((id) => retrieved.includes(id));
	const hitAtK = intersection.length > 0 ? 1 : 0;
	const recallAtK = intersection.length / expected.length;
	const score = (hitAtK + recallAtK) / 2;

	return {
		score,
		rationale: `Hit@K=${hitAtK}, recall@K=${recallAtK.toFixed(2)} (expected [${expected.join(', ')}], retrieved [${retrieved.join(', ') || 'none'}]).`,
		passed: score >= DEMO_PASS_THRESHOLD,
	};
}

export function scoreBehavior(options: {
	expectedBehavior: 'answer' | 'refuse';
	refused: boolean;
}): { passed: boolean; rationale: string } {
	if (options.expectedBehavior === 'refuse') {
		return {
			passed: options.refused,
			rationale: options.refused
				? 'Expected refusal and model refused.'
				: 'Expected refusal but model produced a non-refusal answer.',
		};
	}
	return {
		passed: !options.refused,
		rationale: options.refused
			? 'Expected an answer but model refused.'
			: 'Expected an answer and model answered.',
	};
}

interface JudgeScores {
	faithfulness: MetricScore;
	groundedness: MetricScore;
}

function clamp01(n: number): number {
	if (Number.isNaN(n)) return 0;
	return Math.min(1, Math.max(0, n));
}

function metricFromJudge(
	rawScore: unknown,
	rawRationale: unknown,
	fallbackRationale: string,
): MetricScore {
	const score =
		typeof rawScore === 'number'
			? clamp01(rawScore)
			: clamp01(Number(rawScore));
	const rationale =
		typeof rawRationale === 'string' && rawRationale.trim()
			? rawRationale.trim()
			: fallbackRationale;
	return {
		score,
		rationale,
		passed: score >= DEMO_PASS_THRESHOLD,
	};
}

/**
 * Parse LLM judge JSON. Tolerates fenced markdown and minor prose wrapping.
 */
export function parseJudgeResponse(raw: string): JudgeScores {
	const cleaned = raw
		.trim()
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/i, '')
		.trim();

	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(cleaned) as Record<string, unknown>;
	} catch {
		const match = cleaned.match(/\{[\s\S]*\}/);
		if (!match) {
			return {
				faithfulness: {
					score: 0,
					rationale: 'Judge response was not valid JSON.',
					passed: false,
				},
				groundedness: {
					score: 0,
					rationale: 'Judge response was not valid JSON.',
					passed: false,
				},
			};
		}
		parsed = JSON.parse(match[0]) as Record<string, unknown>;
	}

	const faithfulnessRaw = parsed['faithfulness'];
	const groundednessRaw = parsed['groundedness'];

	const faithObj =
		faithfulnessRaw && typeof faithfulnessRaw === 'object'
			? (faithfulnessRaw as Record<string, unknown>)
			: {};
	const groundObj =
		groundednessRaw && typeof groundednessRaw === 'object'
			? (groundednessRaw as Record<string, unknown>)
			: {};

	return {
		faithfulness: metricFromJudge(
			faithObj['score'] ?? parsed['faithfulnessScore'],
			faithObj['rationale'] ?? parsed['faithfulnessRationale'],
			'No faithfulness rationale from judge.',
		),
		groundedness: metricFromJudge(
			groundObj['score'] ?? parsed['groundednessScore'],
			groundObj['rationale'] ?? parsed['groundednessRationale'],
			'No groundedness rationale from judge.',
		),
	};
}

function buildJudgePrompt(options: {
	question: string;
	answer: string;
	contextText: string;
}): string {
	return `You are evaluating a RAG demo answer. Score ONLY against the retrieved context.

Question: ${options.question}

Retrieved context:
${options.contextText}

Answer:
${options.answer}

Definitions:
- faithfulness (0-1): Are the claims in the answer supported by the retrieved context? Penalize invented facts.
- groundedness (0-1): Does the answer stay tied to the retrieved context rather than general knowledge?

Return ONLY JSON:
{
  "faithfulness": { "score": 0.0, "rationale": "..." },
  "groundedness": { "score": 0.0, "rationale": "..." }
}`;
}

/**
 * LLM-as-judge for faithfulness + groundedness using the generation model.
 */
export async function judgeAnswer(
	env: Env,
	options: {
		question: string;
		answer: string;
		contextText: string;
	},
): Promise<JudgeScores> {
	const prompt = buildJudgePrompt(options);

	const result = (await env.AI.run(
		GENERATION_MODEL,
		{
			messages: [
				{
					role: 'system',
					content:
						'You are a strict RAG evaluation judge. Reply with JSON only. No markdown.',
				},
				{ role: 'user', content: prompt },
			],
			temperature: 0,
			max_tokens: 512,
		},
		env.USE_AI_GATEWAY && env.AI_GATEWAY_ID
			? { gateway: { id: env.AI_GATEWAY_ID } }
			: undefined,
	)) as GenerationResponse;

	const raw = result.response || '';
	return parseJudgeResponse(raw);
}

export const DEFAULT_METRIC_EXPLAINER = {
	retrievalRelevance: {
		means:
			'Whether the top-K retrieved articles include the gold expected article IDs (Hit@K / recall@K over article IDs).',
		doesNotMean:
			'Not a measure of answer quality, citation correctness, or how “smart” the model is — only whether retrieval found the right documents.',
	},
	faithfulness: {
		means:
			'Whether claims in the generated answer are supported by the retrieved context (LLM-as-judge, demo-scale).',
		doesNotMean:
			'Not human-verified truth, not completeness, and not a production accuracy SLA. A high score can still miss important caveats.',
	},
	groundedness: {
		means:
			'Whether the answer stays tied to retrieved context instead of free-floating general knowledge (LLM-as-judge, demo-scale).',
		doesNotMean:
			'Not the same as usefulness or style. An answer can be grounded and still incomplete, or refuse correctly with a low groundedness score.',
	},
} as const;
