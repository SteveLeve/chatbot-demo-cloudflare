import { describe, it, expect, vi } from 'vitest';
import { ChatLogger } from '../../src/utils/chat-logger';
import type { Env } from '../../src/types';
import type { AppEnv } from '../../src/types/app-env';
import type { Context } from 'hono';

interface MockSessionRow {
	id: string;
	session_id: string;
	created_at: number;
	logging_enabled: number;
}

function mockContext(
	headers: Record<string, string> = {},
	vars: Record<string, unknown> = {},
): Context<AppEnv> {
	const varMap = new Map<string, unknown>(Object.entries(vars));
	const header = (name: string) => {
		const key = Object.keys(headers).find(
			(h) => h.toLowerCase() === name.toLowerCase(),
		);
		return key ? headers[key] : undefined;
	};

	return {
		req: {
			header,
			raw: {
				headers: { get: (name: string) => header(name) ?? null },
				cf: {},
			},
		},
		get: (key: string) => varMap.get(key),
		set: (key: string, value: unknown) => {
			varMap.set(key, value);
		},
	} as unknown as Context<AppEnv>;
}

function createMockDatabase() {
	const sessions = new Map<string, MockSessionRow>();
	const inserted: MockSessionRow[] = [];

	const db = {
		prepare: vi.fn((sql: string) => ({
			bind: vi.fn((...args: unknown[]) => ({
				first: vi.fn(async () => {
					if (sql.includes('INSERT INTO chat_sessions')) {
						const row: MockSessionRow = {
							id: `db-${args[1]}`,
							session_id: args[1] as string,
							created_at: Date.now(),
							logging_enabled: 1,
						};
						sessions.set(row.session_id, row);
						inserted.push(row);
						return { id: row.id };
					}
					if (sql.includes('logging_enabled FROM chat_sessions')) {
						const session = sessions.get(args[0] as string);
						return session
							? { logging_enabled: session.logging_enabled }
							: null;
					}
					if (sql.includes('SELECT id, created_at FROM chat_sessions')) {
						const session = sessions.get(args[0] as string);
						return session
							? { id: session.id, created_at: session.created_at }
							: null;
					}
					return null;
				}),
				run: vi.fn(async () => ({ meta: { changes: 1 } })),
			})),
		})),
		_seedSession(sessionId: string, overrides: Partial<MockSessionRow> = {}) {
			sessions.set(sessionId, {
				id: `db-${sessionId}`,
				session_id: sessionId,
				created_at: Date.now(),
				logging_enabled: 1,
				...overrides,
			});
		},
		inserted,
	};

	return db;
}

function baseEnv(db: ReturnType<typeof createMockDatabase>): Env {
	return {
		DATABASE: db,
		CHAT_LOGGING_ENABLED: true,
		CHAT_LOG_IP_SALT: 'test-salt-value',
		LOG_LEVEL: 'ERROR',
	} as unknown as Env;
}

describe('ChatLogger.initializeSession', () => {
	it('reuses a live incoming session id instead of minting a new one', async () => {
		const db = createMockDatabase();
		db._seedSession('sess-live');
		const env = baseEnv(db);
		const ctx = mockContext({ 'x-chat-session-id': 'sess-live' });

		const chatLogger = new ChatLogger(env, ctx);
		await chatLogger.initializeSession();

		expect(chatLogger.getPublicSessionId()).toBe('sess-live');
		expect(db.inserted).toHaveLength(0);
	});

	it('starts a new session when the incoming session id is outside the active window', async () => {
		const db = createMockDatabase();
		db._seedSession('sess-stale', {
			created_at: Date.now() - 31 * 60 * 1000,
		});
		const env = baseEnv(db);
		const ctx = mockContext({ 'x-chat-session-id': 'sess-stale' });

		const chatLogger = new ChatLogger(env, ctx);
		await chatLogger.initializeSession();

		const newId = chatLogger.getPublicSessionId();
		expect(newId).not.toBeNull();
		expect(newId).not.toBe('sess-stale');
		expect(db.inserted).toHaveLength(1);
	});

	it('does not echo a phantom session id when session creation fails', async () => {
		const db = createMockDatabase();
		const env = {
			DATABASE: db,
			CHAT_LOGGING_ENABLED: true,
			// No CHAT_LOG_IP_SALT — createSession() throws before insert.
			LOG_LEVEL: 'ERROR',
		} as unknown as Env;
		const ctx = mockContext();

		const chatLogger = new ChatLogger(env, ctx);
		await chatLogger.initializeSession();

		expect(chatLogger.getPublicSessionId()).toBeNull();
		expect(db.inserted).toHaveLength(0);
	});
});
