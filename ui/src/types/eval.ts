export interface MetricExplainer {
  means: string;
  doesNotMean: string;
}

export interface MetricScoreView {
  score: number;
  rationale: string;
  passed: boolean;
}

export interface CaseEvalResultView {
  caseId: string;
  question: string;
  expectedBehavior: 'answer' | 'refuse';
  expectedArticleIds: string[];
  retrievedArticleIds: string[];
  answer: string;
  refused: boolean;
  retrievalRelevance: MetricScoreView;
  faithfulness: MetricScoreView | null;
  groundedness: MetricScoreView | null;
  behaviorPass: boolean;
  overallPass: boolean;
  latencyMs: number;
  notes?: string;
  error?: string;
}

export interface EvalReportView {
  demoScale: true;
  generatedAt: string;
  source: 'static' | 'live';
  scoredPath: string;
  generationModel: string;
  goldSetVersion: number;
  methodologyLimits: string;
  aggregates: {
    caseCount: number;
    passCount: number;
    failCount: number;
    retrievalRelevance: number;
    faithfulness: number;
    groundedness: number;
    behaviorPassRate: number;
  };
  cases: CaseEvalResultView[];
  metricExplainer: {
    retrievalRelevance: MetricExplainer;
    faithfulness: MetricExplainer;
    groundedness: MetricExplainer;
  };
}
