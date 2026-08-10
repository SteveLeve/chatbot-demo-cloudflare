/**
 * UI types for red-team demo page (mirrors backend src/redteam/types.ts).
 */

export type RedteamCategory =
  'prompt-injection' | 'out-of-corpus' | 'hallucination-pressure';

export type RedteamBehavior = 'refuse' | 'resist' | 'answer';

export interface RedteamObservedOutcome {
  behavior: RedteamBehavior;
  summary: string;
}

export interface RedteamScenario {
  id: string;
  category: RedteamCategory;
  title: string;
  prompt: string;
  expectedDefense: string;
  teachingNotes: string;
  observedOutcome: RedteamObservedOutcome;
}

export interface RedteamScenarioSetView {
  version: number;
  demoScale: true;
  description: string;
  methodologyLimits: string;
  guardrailNote: string;
  scenarios: RedteamScenario[];
  source?: 'static';
}

export interface RedteamTryResultView {
  scenarioId: string;
  category: RedteamCategory;
  title: string;
  prompt: string;
  answer: string;
  behavior: RedteamBehavior;
  refused: boolean;
  expectedDefense: string;
  teachingNotes: string;
  committedOutcome: RedteamObservedOutcome;
  latencyMs: number;
  chatLoggingSkipped: true;
  source: 'live';
}
