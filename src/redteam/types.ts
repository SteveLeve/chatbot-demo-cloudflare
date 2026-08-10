/**
 * Demo-scale red-team types (Phase 5 / #36).
 * Educational framing only — not attack tooling or production security claims.
 */

export type RedteamCategory =
	'prompt-injection' | 'out-of-corpus' | 'hallucination-pressure';

/** Committed / live classification of how the system responded */
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

export interface RedteamScenarioSet {
	version: number;
	demoScale: true;
	description: string;
	methodologyLimits: string;
	guardrailNote: string;
	scenarios: RedteamScenario[];
	/** Set by API when serving */
	source?: 'static';
}

export interface RedteamTryResult {
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
