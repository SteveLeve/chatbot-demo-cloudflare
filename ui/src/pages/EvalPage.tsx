import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DemoLayout } from '../components/layouts/DemoLayout';
import type { ApiResponse } from '../types';
import type { EvalReportView, MetricExplainer } from '../types/eval';
import type { TechStackInfo } from '../types/sidebar';
import { getApiUrl } from '../config';

const TECH_STACK: TechStackInfo = {
  title: 'Built with',
  technologies: [
    'Cloudflare Workers AI',
    'Vectorize',
    'D1',
    'Hybrid eval metrics',
    'React Router v7',
  ],
  description:
    'Demo-scale faithfulness, groundedness, and retrieval relevance over a fixed gold set',
  githubUrl: 'https://github.com/SteveLeve/chatbot-demo-cloudflare',
};

function formatScore(score: number): string {
  return `${(score * 100).toFixed(0)}%`;
}

function MetricCard({
  title,
  score,
  explainer,
}: {
  title: string;
  score: number;
  explainer: MetricExplainer;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
          {formatScore(score)}
        </span>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
        <span className="font-medium">Means: </span>
        {explainer.means}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        <span className="font-medium">Does not mean: </span>
        {explainer.doesNotMean}
      </p>
    </div>
  );
}

function CaseRow({
  caseResult,
  defaultOpen,
}: {
  caseResult: EvalReportView['cases'][number];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const passLabel = caseResult.overallPass ? 'Pass' : 'Fail';
  const passClass = caseResult.overallPass
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200';

  return (
    <div
      className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
      data-testid={`eval-case-${caseResult.caseId}`}
      data-pass={caseResult.overallPass ? 'true' : 'false'}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${passClass}`}
            >
              {passLabel}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {caseResult.caseId}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {caseResult.expectedBehavior}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {caseResult.question}
          </p>
        </div>
        <span className="text-gray-400 shrink-0">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3 text-sm">
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">
              Answer
            </p>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {caseResult.answer || '(empty)'}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <p>
              <span className="font-medium">Expected articles: </span>
              {caseResult.expectedArticleIds.join(', ') || '(none)'}
            </p>
            <p>
              <span className="font-medium">Retrieved articles: </span>
              {caseResult.retrievedArticleIds.join(', ') || '(none)'}
            </p>
          </div>
          <ul className="space-y-2">
            <li>
              <span className="font-medium">Retrieval relevance </span>
              {formatScore(caseResult.retrievalRelevance.score)} —{' '}
              {caseResult.retrievalRelevance.rationale}
            </li>
            {caseResult.faithfulness && (
              <li>
                <span className="font-medium">Faithfulness </span>
                {formatScore(caseResult.faithfulness.score)} —{' '}
                {caseResult.faithfulness.rationale}
              </li>
            )}
            {caseResult.groundedness && (
              <li>
                <span className="font-medium">Groundedness </span>
                {formatScore(caseResult.groundedness.score)} —{' '}
                {caseResult.groundedness.rationale}
              </li>
            )}
          </ul>
          {caseResult.notes && (
            <p className="text-gray-500 dark:text-gray-400">
              {caseResult.notes}
            </p>
          )}
          {caseResult.error && (
            <p className="text-rose-600 dark:text-rose-300">
              Error: {caseResult.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function EvalPage() {
  const [report, setReport] = useState<EvalReportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('/api/v1/eval/report'));
      const data: ApiResponse<EvalReportView> = await response.json();
      if (data.success && data.data) {
        setReport(data.data);
      } else {
        setError(data.error?.message || 'Failed to load eval report');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load eval report',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const rerun = async () => {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('/api/v1/eval/run'), {
        method: 'POST',
      });
      const data: ApiResponse<EvalReportView> = await response.json();
      if (data.success && data.data) {
        setReport(data.data);
      } else {
        setError(data.error?.message || 'Live eval run failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Live eval run failed');
    } finally {
      setRunning(false);
    }
  };

  const failures = report?.cases.filter((c) => !c.overallPass) ?? [];
  const firstFailureId = failures[0]?.caseId;

  return (
    <DemoLayout title="Eval Reporting" techStack={TECH_STACK}>
      <div className="max-w-4xl mx-auto p-6">
        <nav className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          <Link to="/" className="hover:text-gray-900 dark:hover:text-gray-100">
            Home
          </Link>
          {' / '}
          <span className="text-gray-900 dark:text-gray-100">Eval</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Demo-scale eval report
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            Scores over a fixed gold set on the curated corpus. This page
            teaches what the metrics measure — it does not claim production
            quality.
          </p>

          <div
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-950 dark:text-amber-100"
            data-testid="eval-methodology"
          >
            <p className="font-semibold mb-1">Methodology limits</p>
            <p className="text-sm">
              {report?.methodologyLimits ||
                'A few dozen cases over ~37 articles support teaching concepts, not quality claims.'}
            </p>
          </div>
        </div>

        {loading && (
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">
            Loading report…
          </p>
        )}

        {error && (
          <div className="mb-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-900 dark:text-rose-200">
            {error}
          </div>
        )}

        {report && !loading && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-gray-600 dark:text-gray-400">
              <span>
                Source:{' '}
                <strong className="text-gray-900 dark:text-gray-100">
                  {report.source}
                </strong>
              </span>
              <span>·</span>
              <span>Path: {report.scoredPath}</span>
              <span>·</span>
              <span>
                {report.aggregates.passCount}/{report.aggregates.caseCount} pass
                ·{' '}
                <span data-testid="eval-fail-count">
                  {report.aggregates.failCount} fail
                </span>
              </span>
              <span>·</span>
              <span className="font-mono text-xs">{report.generatedAt}</span>
            </div>

            <div className="grid gap-4 mb-8">
              <MetricCard
                title="Retrieval relevance"
                score={report.aggregates.retrievalRelevance}
                explainer={report.metricExplainer.retrievalRelevance}
              />
              <MetricCard
                title="Faithfulness"
                score={report.aggregates.faithfulness}
                explainer={report.metricExplainer.faithfulness}
              />
              <MetricCard
                title="Groundedness"
                score={report.aggregates.groundedness}
                explainer={report.metricExplainer.groundedness}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Per-case detail
              </h2>
              <button
                type="button"
                onClick={() => void rerun()}
                disabled={running}
                className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 disabled:opacity-50"
              >
                {running ? 'Re-running…' : 'Re-run demo eval (live)'}
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Live re-run is optional, rate-limited, and ephemeral — it does not
              overwrite the committed snapshot. Failures are listed below, not
              hidden.
            </p>

            {failures.length > 0 && (
              <div
                className="mb-4 text-sm text-rose-700 dark:text-rose-300"
                data-testid="eval-failures-banner"
              >
                Showing {failures.length} failure case(s) first (teaching
                examples included).
              </div>
            )}

            <div className="space-y-3">
              {[...report.cases]
                .sort((a, b) => Number(a.overallPass) - Number(b.overallPass))
                .map((caseResult) => (
                  <CaseRow
                    key={caseResult.caseId}
                    caseResult={caseResult}
                    defaultOpen={caseResult.caseId === firstFailureId}
                  />
                ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              <Link
                to="/docs/corpus"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Browse the corpus
              </Link>
              {' · '}
              <Link
                to="/docs/glossary"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Glossary
              </Link>
              {' · '}
              <Link
                to="/demos/basic-rag"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Try Basic RAG
              </Link>
            </div>
          </>
        )}
      </div>
    </DemoLayout>
  );
}
