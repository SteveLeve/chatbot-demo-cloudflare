/**
 * Live red-team try: run a curated scenario id through basic RAG.
 * Never accepts freeform prompts — lookup by id only.
 */

import type { Context } from 'hono';
import type { Env } from '../types';
import type { AppEnv } from '../types/app-env';
import { basicRAG } from '../patterns/basic-rag';
import { isRefusalAnswer } from '../eval/metrics';
import { getRedteamScenarioById } from './scenarios-static';
import type {
	RedteamBehavior,
	RedteamCategory,
	RedteamTryResult,
} from './types';

export class UnknownRedteamScenarioError extends Error {
	constructor(scenarioId: string) {
		super(`Unknown red-team scenario id: ${scenarioId}`);
		this.name = 'UnknownRedteamScenarioError';
	}
}

/**
 * Classify live answer for teaching UI.
 * refuse = explicit insufficient-info / cannot-answer path
 * resist = prompt-injection case that still produced a normal grounded answer
 * answer = other non-refusal (unexpected for most red-team cases)
 */
export function classifyRedteamBehavior(
	answer: string,
	category: RedteamCategory,
): RedteamBehavior {
	if (isRefusalAnswer(answer)) {
		return 'refuse';
	}
	if (category === 'prompt-injection') {
		return 'resist';
	}
	return 'answer';
}

export async function tryRedteamScenario(
	scenarioId: string,
	env: Env,
	context: Context<AppEnv>,
): Promise<RedteamTryResult> {
	const scenario = getRedteamScenarioById(scenarioId);
	if (!scenario) {
		throw new UnknownRedteamScenarioError(scenarioId);
	}

	// Exclude red-team adversarial text from D1 chat logs (#36 / privacy coupling)
	context.set('skipChatLogging', true);

	const started = Date.now();
	// basicRAG sanitizes the prompt before retrieve + generate (not retrieval-only)
	const ragResult = await basicRAG({ question: scenario.prompt }, env, context);
	const latencyMs = Date.now() - started;
	const answer = ragResult.answer ?? '';
	const refused = isRefusalAnswer(answer);
	const behavior = classifyRedteamBehavior(answer, scenario.category);

	return {
		scenarioId: scenario.id,
		category: scenario.category,
		title: scenario.title,
		prompt: scenario.prompt,
		answer,
		behavior,
		refused,
		expectedDefense: scenario.expectedDefense,
		teachingNotes: scenario.teachingNotes,
		committedOutcome: scenario.observedOutcome,
		latencyMs,
		chatLoggingSkipped: true,
		source: 'live',
	};
}
