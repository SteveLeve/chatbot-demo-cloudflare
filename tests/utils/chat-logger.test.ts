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
	const messageChunks: unknown[][] = [];

	const db = {
		prepare: vi.fn((sql: string) => ({
			bind: vi.fn((...args: unknown[]) => {
				const bound = {
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
						if (sql.includes('INSERT INTO chat_messages')) {
							return { id: `msg-${args[0]}` };
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
					run: vi.fn(async () => {
						if (sql.includes('INSERT INTO message_chunks')) {
							messageChunks.push(args);
						}
						return { meta: { changes: 1 } };
					}),
				};
				return bound;
			}),
		})),
		batch: vi.fn(async (statements: Array<{ run: () => Promise<unknown> }>) => {
			for (const statement of statements) {
				await statement.run();
			}
		}),
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
		messageChunks,
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

describe('ChatLogger.logMessage', () => {
	it('batches RAG chunk inserts instead of writing one statement at a time', async () => {
		const db = createMockDatabase();
		db._seedSession('sess-live');
		const env = baseEnv(db);
		const ctx = mockContext({ 'x-chat-session-id': 'sess-live' });

		const chatLogger = new ChatLogger(env, ctx);
		await chatLogger.initializeSession();
		await chatLogger.logMessage({
			role: 'assistant',
			content: 'AI is intelligence demonstrated by machines. [1]',
			messageIndex: 1,
			sources: [
				{
					documentId: 'doc-1',
					articleId: 'artificial-intelligence',
					chunkId: 'chunk-1',
					title: 'Artificial intelligence',
					chunkText: 'AI is intelligence demonstrated by machines.',
					chunkIndex: 0,
					similarity: 0.91,
				},
				{
					documentId: 'doc-1',
					articleId: 'artificial-intelligence',
					chunkId: 'chunk-2',
					title: 'Artificial intelligence',
					chunkText: 'Machine learning is a subset of AI.',
					chunkIndex: 1,
					similarity: 0.84,
				},
			],
		});

		expect(db.batch).toHaveBeenCalledOnce();
		expect(db.messageChunks).toHaveLength(2);
		expect(db.messageChunks[0]?.[3]).toBe('chunk-1');
		expect(db.messageChunks[1]?.[3]).toBe('chunk-2');
	});
});
