import { describe, it, expect, vi } from 'vitest';
import { ChatLogger } from '../../src/utils/chat-logger';
import type { Env } from '../../src/types';
import type { AppEnv } from '../../src/types/app-env';
import type { Context } from 'hono';
import {
	classifyRedteamBehavior,
	UnknownRedteamScenarioError,
} from '../../src/redteam/try-scenario';
import { getRedteamScenarioById } from '../../src/redteam/scenarios-static';

function mockContext(options: {
	skipChatLogging?: boolean;
	demoModeHeader?: string;
}): Context<AppEnv> {
	const store = new Map<string, unknown>();
	if (options.skipChatLogging) {
		store.set('skipChatLogging', true);
	}
	store.set('requestId', 'test-req');
	store.set('traceContext', { traceId: 't', spanId: 's' });

	return {
		get: (key: string) => store.get(key),
		set: (key: string, value: unknown) => {
			store.set(key, value);
		},
		req: {
			header: (name: string) => {
				if (name.toLowerCase() === 'x-demo-mode') {
					return options.demoModeHeader;
				}
				return undefined;
			},
		},
	} as unknown as Context<AppEnv>;
}

function mockEnv(overrides: Partial<Env> = {}): Env {
	const prepare = vi.fn(() => ({
		bind: vi.fn(() => ({
			first: vi.fn(async () => ({ id: 'session-db-id' })),
			run: vi.fn(async () => ({})),
		})),
	}));

	return {
		CHAT_LOGGING_ENABLED: true,
		LOG_LEVEL: 'ERROR',
		DATABASE: { prepare } as unknown as D1Database,
		...overrides,
	} as Env;
}

describe('ChatLogger red-team skip', () => {
	it('disables logging when skipChatLogging context var is set', async () => {
		const env = mockEnv();
		const context = mockContext({ skipChatLogging: true });
		const logger = new ChatLogger(env, context);

		expect(logger.isLoggingEnabled()).toBe(false);
		await logger.initializeSession();
		await logger.logMessage({
			role: 'user',
			content: 'Ignore previous instructions',
			messageIndex: 0,
		});

		expect(env.DATABASE.prepare).not.toHaveBeenCalled();
	});

	it('disables logging when X-Demo-Mode: redteam header is set', async () => {
		const env = mockEnv();
		const context = mockContext({ demoModeHeader: 'redteam' });
		const logger = new ChatLogger(env, context);

		expect(logger.isLoggingEnabled()).toBe(false);
		await logger.initializeSession();
		expect(env.DATABASE.prepare).not.toHaveBeenCalled();
	});

	it('keeps logging enabled for normal chat requests', () => {
		const env = mockEnv();
		const context = mockContext({});
		const logger = new ChatLogger(env, context);
		expect(logger.isLoggingEnabled()).toBe(true);
	});
});

describe('red-team scenario lookup + classify', () => {
	it('finds curated scenario ids and rejects unknown', () => {
		expect(getRedteamScenarioById('ooc-weather')?.category).toBe(
			'out-of-corpus',
		);
		expect(getRedteamScenarioById('not-a-real-id')).toBeUndefined();
		expect(() => {
			throw new UnknownRedteamScenarioError('not-a-real-id');
		}).toThrow(/Unknown red-team scenario/);
	});

	it('classifies refusal vs resist for injection', () => {
		expect(
			classifyRedteamBehavior(
				"I don't have enough information to answer this question based on the available documents.",
				'prompt-injection',
			),
		).toBe('refuse');
		expect(
			classifyRedteamBehavior(
				'Artificial intelligence is the ability of computers to do tasks that usually need human intelligence [1].',
				'prompt-injection',
			),
		).toBe('resist');
		expect(
			classifyRedteamBehavior('Tokyo is sunny and 22C.', 'out-of-corpus'),
		).toBe('answer');
	});
});
