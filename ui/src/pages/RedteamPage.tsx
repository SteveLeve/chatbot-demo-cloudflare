import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DemoLayout } from '../components/layouts/DemoLayout';
import type { ApiResponse } from '../types';
import type {
  RedteamBehavior,
  RedteamCategory,
  RedteamScenario,
  RedteamScenarioSetView,
  RedteamTryResultView,
} from '../types/redteam';
import type { TechStackInfo } from '../types/sidebar';
import { getApiUrl } from '../config';

const TECH_STACK: TechStackInfo = {
  title: 'Built with',
  technologies: [
    'Input sanitization',
    'Grounded system prompts',
    'Empty-retrieval refusal',
    'Cloudflare Workers AI',
    'React Router v7',
  ],
  description:
    'Curated adversarial scenarios that show how this demo resists injection, out-of-corpus asks, and hallucination pressure',
  githubUrl: 'https://github.com/SteveLeve/chatbot-demo-cloudflare',
};

const CATEGORY_LABELS: Record<RedteamCategory, string> = {
  'prompt-injection': 'Prompt injection',
  'out-of-corpus': 'Out-of-corpus',
  'hallucination-pressure': 'Hallucination pressure',
};

const CATEGORY_ORDER: RedteamCategory[] = [
  'prompt-injection',
  'out-of-corpus',
  'hallucination-pressure',
];

function behaviorClass(behavior: RedteamBehavior): string {
  switch (behavior) {
    case 'refuse':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'resist':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
    default:
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100';
  }
}

function ScenarioDetail({
  scenario,
  liveResult,
  trying,
  tryError,
  onTryLive,
}: {
  scenario: RedteamScenario;
  liveResult: RedteamTryResultView | null;
  trying: boolean;
  tryError: string | null;
  onTryLive: () => void;
}) {
  return (
    <div
      className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-5"
      data-testid={`redteam-scenario-${scenario.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            {CATEGORY_LABELS[scenario.category]}
          </p>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {scenario.title}
          </h3>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${behaviorClass(scenario.observedOutcome.behavior)}`}
        >
          Expected: {scenario.observedOutcome.behavior}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Curated prompt
        </p>
        <pre className="text-sm whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md p-3 text-gray-800 dark:text-gray-200">
          {scenario.prompt}
        </pre>
      </div>

      <div className="grid gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Expected defense
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {scenario.expectedDefense}
          </p>
        </div>
        <div data-testid="redteam-teaching-notes">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Why this works
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {scenario.teachingNotes}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Committed observed outcome
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {scenario.observedOutcome.summary}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onTryLive}
          disabled={trying}
          className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 disabled:opacity-50"
          data-testid="redteam-try-live"
        >
          {trying ? 'Trying live…' : 'Try live (this scenario)'}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Runs by scenario id only · skips D1 chat logging · rate-limited
        </p>
      </div>

      {tryError && (
        <div className="mt-3 text-sm text-rose-700 dark:text-rose-300">
          {tryError}
        </div>
      )}

      {liveResult && liveResult.scenarioId === scenario.id && (
        <div
          className="mt-4 grid gap-3 md:grid-cols-2"
          data-testid="redteam-live-result"
        >
          <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
              Live answer
            </p>
            <span
              className={`inline-block text-xs font-medium px-2 py-0.5 rounded mb-2 ${behaviorClass(liveResult.behavior)}`}
            >
              {liveResult.behavior}
            </span>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {liveResult.answer}
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {liveResult.latencyMs}ms · chatLoggingSkipped=
              {String(liveResult.chatLoggingSkipped)}
            </p>
          </div>
          <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
              Expected defense (reminder)
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {liveResult.expectedDefense}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function RedteamPage() {
  const [set, setSet] = useState<RedteamScenarioSetView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<RedteamCategory | 'all'>(
    'all',
  );
  const [trying, setTrying] = useState(false);
  const [tryError, setTryError] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<RedteamTryResultView | null>(
    null,
  );

  const loadScenarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('/api/v1/redteam/scenarios'));
      const data: ApiResponse<RedteamScenarioSetView> = await response.json();
      if (data.success && data.data) {
        setSet(data.data);
        const first = data.data.scenarios[0];
        if (first) setSelectedId(first.id);
      } else {
        setError(data.error?.message || 'Failed to load red-team scenarios');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load red-team scenarios',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadScenarios();
  }, [loadScenarios]);

  const filtered = useMemo(() => {
    if (!set) return [];
    if (categoryFilter === 'all') return set.scenarios;
    return set.scenarios.filter((s) => s.category === categoryFilter);
  }, [set, categoryFilter]);

  const selected = useMemo(
    () => filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  useEffect(() => {
    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId]);

  const tryLive = async (scenarioId: string) => {
    setTrying(true);
    setTryError(null);
    setLiveResult(null);
    try {
      const response = await fetch(getApiUrl('/api/v1/redteam/try'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenarioId }),
      });
      const data: ApiResponse<RedteamTryResultView> = await response.json();
      if (data.success && data.data) {
        setLiveResult(data.data);
      } else {
        setTryError(data.error?.message || 'Live try failed');
      }
    } catch (err) {
      setTryError(err instanceof Error ? err.message : 'Live try failed');
    } finally {
      setTrying(false);
    }
  };

  return (
    <DemoLayout title="Red-team Demo" techStack={TECH_STACK}>
      <div className="max-w-4xl mx-auto p-6">
        <nav className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          <Link to="/" className="hover:text-gray-900 dark:hover:text-gray-100">
            Home
          </Link>
          {' / '}
          <span className="text-gray-900 dark:text-gray-100">Red-team</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Red-team / adversarial demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            Pick a curated scenario to see the expected defense and teaching
            notes. Optional live try runs that scenario id only — this page is
            not attack tooling.
          </p>

          <div
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-950 dark:text-amber-100"
            data-testid="redteam-methodology"
          >
            <p className="font-semibold mb-1">Educational guardrails</p>
            <p className="text-sm mb-2">
              {set?.methodologyLimits ||
                'Small hand-written set over ~37 articles — teaching defenses, not a security audit.'}
            </p>
            <p className="text-sm">
              {set?.guardrailNote ||
                'Only curated scenario IDs can be run live. Freeform adversarial prompts are not accepted here.'}
            </p>
          </div>
        </div>

        {loading && (
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">
            Loading scenarios…
          </p>
        )}

        {error && (
          <div className="mb-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-900 dark:text-rose-200">
            {error}
          </div>
        )}

        {set && !loading && (
          <>
            <div className="flex flex-wrap gap-2 mb-6" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={categoryFilter === 'all'}
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  categoryFilter === 'all'
                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                All ({set.scenarios.length})
              </button>
              {CATEGORY_ORDER.map((cat) => {
                const count = set.scenarios.filter(
                  (s) => s.category === cat,
                ).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={categoryFilter === cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      categoryFilter === cat
                        ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                    data-testid={`redteam-filter-${cat}`}
                  >
                    {CATEGORY_LABELS[cat]} ({count})
                  </button>
                );
              })}
            </div>

            <div className="grid gap-6 md:grid-cols-[220px_1fr]">
              <div className="space-y-2" data-testid="redteam-picker">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scenarios
                </p>
                {filtered.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(scenario.id);
                      setTryError(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm border ${
                      selected?.id === scenario.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {scenario.title}
                  </button>
                ))}
              </div>

              <div>
                {selected ? (
                  <ScenarioDetail
                    scenario={selected}
                    liveResult={liveResult}
                    trying={trying}
                    tryError={tryError}
                    onTryLive={() => void tryLive(selected.id)}
                  />
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No scenarios in this category.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              <Link
                to="/docs/eval"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Eval report
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
                to="/docs/corpus"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Browse the corpus
              </Link>
            </div>
          </>
        )}
      </div>
    </DemoLayout>
  );
}
