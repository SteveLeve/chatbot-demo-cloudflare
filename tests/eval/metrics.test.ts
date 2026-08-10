import { describe, it, expect } from 'vitest';
import {
	isRefusalAnswer,
	parseJudgeResponse,
	scoreBehavior,
	scoreRetrievalRelevance,
	DEMO_PASS_THRESHOLD,
} from '../../src/eval/metrics';

describe('scoreRetrievalRelevance', () => {
	it('scores hit and recall for answer cases', () => {
		const result = scoreRetrievalRelevance({
			expectedArticleIds: ['linux', 'operating-system'],
			retrievedArticleIds: ['linux', 'linus-torvalds'],
			expectedBehavior: 'answer',
		});

		expect(result.score).toBe(0.75);
		expect(result.passed).toBe(true);
		expect(result.rationale).toContain('Hit@K=1');
	});

	it('fails when expected articles are missing', () => {
		const result = scoreRetrievalRelevance({
			expectedArticleIds: ['atom'],
			retrievedArticleIds: ['chemistry', 'physics'],
			expectedBehavior: 'answer',
		});

		expect(result.score).toBe(0);
		expect(result.passed).toBe(false);
	});

	it('passes refuse cases with empty expected ids', () => {
		const result = scoreRetrievalRelevance({
			expectedArticleIds: [],
			retrievedArticleIds: ['apple-inc'],
			expectedBehavior: 'refuse',
		});

		expect(result.score).toBe(1);
		expect(result.passed).toBe(true);
	});
});

describe('isRefusalAnswer / scoreBehavior', () => {
	it('detects refusal phrases', () => {
		expect(
			isRefusalAnswer(
				'I cannot answer this question based on the provided documents.',
			),
		).toBe(true);
		expect(isRefusalAnswer('Linux is an operating system [1].')).toBe(false);
	});

	it('checks refuse vs answer behavior', () => {
		expect(
			scoreBehavior({ expectedBehavior: 'refuse', refused: true }).passed,
		).toBe(true);
		expect(
			scoreBehavior({ expectedBehavior: 'refuse', refused: false }).passed,
		).toBe(false);
		expect(
			scoreBehavior({ expectedBehavior: 'answer', refused: false }).passed,
		).toBe(true);
	});
});

describe('parseJudgeResponse', () => {
	it('parses clean JSON scores', () => {
		const parsed = parseJudgeResponse(
			JSON.stringify({
				faithfulness: { score: 0.9, rationale: 'Supported' },
				groundedness: { score: 0.8, rationale: 'Grounded' },
			}),
		);

		expect(parsed.faithfulness.score).toBe(0.9);
		expect(parsed.faithfulness.passed).toBe(true);
		expect(parsed.groundedness.score).toBe(0.8);
		expect(parsed.groundedness.passed).toBe(DEMO_PASS_THRESHOLD <= 0.8);
	});

	it('parses fenced JSON and clamps scores', () => {
		const parsed = parseJudgeResponse(`\`\`\`json
{"faithfulness":{"score":1.5,"rationale":"too high"},"groundedness":{"score":-0.2,"rationale":"too low"}}
\`\`\``);

		expect(parsed.faithfulness.score).toBe(1);
		expect(parsed.groundedness.score).toBe(0);
	});

	it('returns zeros when JSON is missing', () => {
		const parsed = parseJudgeResponse('not json at all');
		expect(parsed.faithfulness.score).toBe(0);
		expect(parsed.faithfulness.passed).toBe(false);
		expect(parsed.groundedness.rationale).toContain('not valid JSON');
	});
});
