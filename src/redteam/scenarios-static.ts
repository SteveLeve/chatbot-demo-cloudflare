/**
 * Serve the committed red-team scenario snapshot.
 * Live try is POST /api/v1/redteam/try (by scenario id only).
 */

import scenariosJson from '../../data/redteam/scenarios.json';
import type { RedteamScenario, RedteamScenarioSet } from './types';

export function getStaticRedteamScenarios(): RedteamScenarioSet {
	const set = scenariosJson as RedteamScenarioSet;
	return {
		...set,
		demoScale: true,
		source: 'static',
	};
}

export function getRedteamScenarioById(
	scenarioId: string,
): RedteamScenario | undefined {
	const set = getStaticRedteamScenarios();
	return set.scenarios.find((s) => s.id === scenarioId);
}
