import { describe, it, expect, vi } from 'vitest';
import {
	exportUserData,
	deleteUserData,
	optOutOfLogging,
	isSessionLoggingOptedOut,
	extractPrivacySessionId,
} from '../../src/utils/privacy-data';
import { AppError } from '../../src/types';
import type { Env } from '../../src/types';
import type { AppEnv } from '../../src/types/app-env';
import type { Context } from 'hono';

function mockContext(headers: Record<string, string>): Context<AppEnv> {
	return {
		req: {
			header: (name: string) => {
				const key = Object.keys(headers).find(
					(h) => h.toLowerCase() === name.toLowerCase(),
				);
				return key ? headers[key] : undefined;
			},
		},
	} as unknown as Context<AppEnv>;
}

function createMockDatabase() {
	const sessions = new Map<
		string,
		{
			id: string;
			session_id: string;
			created_at: number;
			expires_at: number;
			country: string;
			region: string;
			city: string;
			message_count: number;
			is_active: number;
			logging_enabled: number;
		}
	>();

	const messages: Array<{
		id: string;
		session_id: string;
		role: string;
		content: string;
		created_at: number;
		model_name: string | null;
		has_error: number;
	}> = [];

	const deletionLog: Array<{ session_id: string; deleted_at: number }> = [];

	const db = {
		prepare: vi.fn((sql: string) => ({
			bind: vi.fn((...args: unknown[]) => ({
				first: vi.fn(async () => {
					if (
						sql.includes('FROM chat_sessions') &&
						sql.includes('session_id = ?')
					) {
						if (sql.includes('logging_enabled FROM')) {
							const session = sessions.get(args[0] as string);
							return session
								? { logging_enabled: session.logging_enabled }
								: null;
						}
						if (sql.includes('SELECT id FROM')) {
							const session = sessions.get(args[0] as string);
							return session ? { id: session.id } : null;
						}
						const session = sessions.get(args[0] as string);
						return session ?? null;
					}
					return null;
				}),
				all: vi.fn(async () => {
					if (sql.includes('FROM chat_messages')) {
						const sessionDbId = args[0] as string;
						return {
							results: messages.filter((m) => m.session_id === sessionDbId),
						};
					}
					if (sql.includes('FROM message_chunks')) {
						return { results: [] };
					}
					return { results: [] };
				}),
				run: vi.fn(async () => {
					if (sql.includes('DELETE FROM chat_sessions')) {
						const sid = args[0] as string;
						const existed = sessions.delete(sid);
						return { meta: { changes: existed ? 1 : 0 } };
					}
					if (sql.includes('INSERT INTO deletion_log')) {
						deletionLog.push({
							session_id: args[0] as string,
							deleted_at: args[1] as number,
						});
						return { meta: { changes: 1 } };
					}
					if (sql.includes('UPDATE chat_sessions')) {
						const session = sessions.get(args[1] as string);
						if (session) {
							session.logging_enabled = 0;
							return { meta: { changes: 1 } };
						}
						return { meta: { changes: 0 } };
					}
					return { meta: { changes: 0 } };
				}),
			})),
		})),
		_seedSession(sessionId: string, createdAt: number = Date.now()) {
			sessions.set(sessionId, {
				id: 'db-internal-id',
				session_id: sessionId,
				created_at: createdAt,
				expires_at: createdAt + 90 * 24 * 60 * 60 * 1000,
				country: 'US',
				region: 'CA',
				city: 'SF',
				message_count: 1,
				is_active: 1,
				logging_enabled: 1,
			});
			messages.push({
				id: 'msg-1',
				session_id: 'db-internal-id',
				role: 'user',
				content: 'hello',
				created_at: Date.now(),
				model_name: null,
				has_error: 0,
			});
		},
		deletionLog,
	};

	return db;
}

describe('privacy-data', () => {
	it('extractPrivacySessionId reads x-chat-session-id and X-Session-ID', () => {
		expect(
			extractPrivacySessionId(mockContext({ 'x-chat-session-id': 'abc-123' })),
		).toBe('abc-123');
		expect(
			extractPrivacySessionId(mockContext({ 'X-Session-ID': 'def-456' })),
		).toBe('def-456');
		expect(extractPrivacySessionId(mockContext({}))).toBeNull();
	});

	it('exportUserData returns session and messages', async () => {
		const db = createMockDatabase();
		db._seedSession('sess-export');
		const env = { DATABASE: db } as unknown as Env;

		const data = await exportUserData('sess-export', env);
		expect(data.session.id).toBe('sess-export');
		expect(data.messages).toHaveLength(1);
		expect(data.metadata.retention_period).toBe('90 days');
	});

	it('deleteUserData removes session and writes audit log', async () => {
		const db = createMockDatabase();
		db._seedSession('sess-delete');
		const env = { DATABASE: db } as unknown as Env;

		await deleteUserData('sess-delete', env);
		expect(db.deletionLog).toHaveLength(1);
		expect(db.deletionLog[0]?.session_id).toBe('sess-delete');
	});

	it('exportUserData rejects sessions older than the self-service action window', async () => {
		const db = createMockDatabase();
		db._seedSession('sess-stale-export', Date.now() - 31 * 60 * 1000);
		const env = { DATABASE: db } as unknown as Env;

		await expect(
			exportUserData('sess-stale-export', env),
		).rejects.toMatchObject({
			code: 'SESSION_EXPIRED',
			statusCode: 403,
		});
	});

	it('deleteUserData rejects sessions older than the self-service action window', async () => {
		const db = createMockDatabase();
		db._seedSession('sess-stale-delete', Date.now() - 31 * 60 * 1000);
		const env = { DATABASE: db } as unknown as Env;

		await expect(
			deleteUserData('sess-stale-delete', env),
		).rejects.toBeInstanceOf(AppError);
		expect(db.deletionLog).toHaveLength(0);
	});

	it('exportUserData allows sessions within the self-service action window', async () => {
		const db = createMockDatabase();
		db._seedSession('sess-fresh-export', Date.now() - 5 * 60 * 1000);
		const env = { DATABASE: db } as unknown as Env;

		await expect(
			exportUserData('sess-fresh-export', env),
		).resolves.toBeDefined();
	});

	it('optOutOfLogging disables logging for session', async () => {
		const db = createMockDatabase();
		db._seedSession('sess-optout');
		const env = { DATABASE: db } as unknown as Env;

		await optOutOfLogging('sess-optout', env);
		expect(await isSessionLoggingOptedOut('sess-optout', env)).toBe(true);
	});
});
