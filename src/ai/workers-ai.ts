/**
 * Thin adapter: Workers AI + optional AI Gateway for the Agents SDK tool loop.
 * Confined to this module per ADR boundary table.
 */

import { createWorkersAI } from 'workers-ai-provider';
import type { Env } from '../types';

export function createWorkersAIModel(env: Env) {
	const gateway =
		env.USE_AI_GATEWAY && env.AI_GATEWAY_ID
			? { id: env.AI_GATEWAY_ID }
			: undefined;

	return createWorkersAI({
		binding: env.AI,
		gateway,
	});
}
