import { describe, it, expect } from 'vitest';
import {
	EVAL_BATCH_SIZE,
	chunkCaseIds,
	mergeEvalReports,
	placeholderBatchReport,
} from '../../src/eval/runner';
import type { EvalReport } from '../../src/eval/types';

function stubReport(caseIds: string[], pass: boolean): EvalReport {
	const cases = caseIds.map((caseId) => ({
		caseId,
		question: caseId,
		expectedBehavior: 'answer' as const,
		expectedArticleIds: [caseId],
		retrievedArticleIds: pass ? [caseId] : [],
		answer: pass ? 'ok' : '',
		refused: !pass,
		retrievalRelevance: {
			score: pass ? 1 : 0,
			rationale: 'stub',
			passed: pass,
		},
		faithfulness: {
			score: pass ? 1 : 0,
			rationale: 'stub',
			passed: pass,
		},
		groundedness: {
			score: pass ? 1 : 0,
			rationale: 'stub',
			passed: pass,
		},
		behaviorPass: pass,
		overallPass: pass,
		latencyMs: 1,
	}));

	return {
		demoScale: true,
		generatedAt: '2026-08-20T00:00:00.000Z',
		source: 'live',
		scoredPath: 'basic-rag',
		generationModel: 'test',
		goldSetVersion: 1,
		methodologyLimits: 'demo',
		aggregates: {
			caseCount: cases.length,
			passCount: cases.filter((c) => c.overallPass).length,
			failCount: cases.filter((c) => !c.overallPass).length,
			retrievalRelevance: pass ? 1 : 0,
			faithfulness: pass ? 1 : 0,
			groundedness: pass ? 1 : 0,
			behaviorPassRate: pass ? 1 : 0,
		},
		cases,
		metricExplainer: {
			retrievalRelevance: { means: '', doesNotMean: '' },
			faithfulness: { means: '', doesNotMean: '' },
			groundedness: { means: '', doesNotMean: '' },
		},
	};
}

describe('eval run batching', () => {
	it('chunks gold ids into batches that fit the subrequest cap', () => {
		const batches = chunkCaseIds(
			Array.from({ length: 24 }, (_, i) => `c${i}`),
			EVAL_BATCH_SIZE,
		);
		expect(batches).toHaveLength(4);
		expect(batches[0]).toHaveLength(6);
		expect(batches[3]).toHaveLength(6);
	});

	it('merges child reports and recomputes aggregates', () => {
		const merged = mergeEvalReports([
			stubReport(['a'], true),
			stubReport(['b'], false),
		]);
		expect(merged.cases.map((c) => c.caseId)).toEqual(['a', 'b']);
		expect(merged.aggregates.caseCount).toBe(2);
		expect(merged.aggregates.passCount).toBe(1);
		expect(merged.aggregates.failCount).toBe(1);
		expect(merged.source).toBe('live');
	});

	it('placeholder batches mark every case failed without dropping ids', () => {
		const report = placeholderBatchReport(['ai-definition'], 'child 500');
		expect(report.cases).toHaveLength(1);
		expect(report.cases[0]?.caseId).toBe('ai-definition');
		expect(report.cases[0]?.error).toBe('child 500');
		expect(report.cases[0]?.overallPass).toBe(false);
	});
});
