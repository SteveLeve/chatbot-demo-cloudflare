import { describe, it, expect, vi, beforeEach } from 'vitest';

const createWorkersAI = vi.fn().mockReturnValue({ chat: vi.fn() });

vi.mock('workers-ai-provider', () => ({
	createWorkersAI: (...args: unknown[]) => createWorkersAI(...args),
}));

import { createWorkersAIModel } from '../../src/ai/workers-ai';

describe('createWorkersAIModel', () => {
	beforeEach(() => {
		createWorkersAI.mockClear();
	});

	it('passes AI binding without gateway when gateway is disabled', () => {
		const env = {
			AI: {} as Ai,
			USE_AI_GATEWAY: false,
		} as unknown as Env;

		createWorkersAIModel(env);

		expect(createWorkersAI).toHaveBeenCalledWith({
			binding: env.AI,
			gateway: undefined,
		});
	});

	it('passes gateway id when AI Gateway is enabled', () => {
		const env = {
			AI: {} as Ai,
			USE_AI_GATEWAY: true,
			AI_GATEWAY_ID: 'rag-demo',
		} as unknown as Env;

		createWorkersAIModel(env);

		expect(createWorkersAI).toHaveBeenCalledWith({
			binding: env.AI,
			gateway: { id: 'rag-demo' },
		});
	});
});
