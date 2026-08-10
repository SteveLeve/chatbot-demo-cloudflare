/**
 * Demo-scale eval types (Phase 4 / #35).
 * Labels and payloads are educational — not production quality claims.
 */

export type ExpectedBehavior = 'answer' | 'refuse';

export interface EvalGoldCase {
	id: string;
	question: string;
	expectedArticleIds: string[];
	expectedBehavior: ExpectedBehavior;
	notes?: string;
}

export interface EvalGoldSet {
	version: number;
	demoScale: true;
	description: string;
	topK: number;
	methodologyLimits: string;
	cases: EvalGoldCase[];
}

export interface MetricScore {
	/** 0–1 score */
	score: number;
	/** Short human-readable rationale */
	rationale: string;
	/** Whether this case met the demo pass threshold for this metric */
	passed: boolean;
}

export interface CaseEvalResult {
	caseId: string;
	question: string;
	expectedBehavior: ExpectedBehavior;
	expectedArticleIds: string[];
	retrievedArticleIds: string[];
	answer: string;
	refused: boolean;
	retrievalRelevance: MetricScore;
	faithfulness: MetricScore | null;
	groundedness: MetricScore | null;
	behaviorPass: boolean;
	overallPass: boolean;
	latencyMs: number;
	notes?: string;
	error?: string;
}

export interface EvalAggregates {
	caseCount: number;
	passCount: number;
	failCount: number;
	retrievalRelevance: number;
	faithfulness: number;
	groundedness: number;
	behaviorPassRate: number;
}

export interface EvalReport {
	demoScale: true;
	generatedAt: string;
	source: 'static' | 'live';
	scoredPath: 'basic-rag';
	generationModel: string;
	goldSetVersion: number;
	methodologyLimits: string;
	aggregates: EvalAggregates;
	cases: CaseEvalResult[];
	metricExplainer: {
		retrievalRelevance: { means: string; doesNotMean: string };
		faithfulness: { means: string; doesNotMean: string };
		groundedness: { means: string; doesNotMean: string };
	};
}
