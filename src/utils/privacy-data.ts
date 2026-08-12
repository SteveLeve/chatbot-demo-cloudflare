/**
 * GDPR/CCPA user data rights — export, delete, opt-out (#19)
 */

import type { Context } from 'hono';
import type { Env } from '../types';
import type { AppEnv } from '../types/app-env';
import { AppError } from '../types';

export interface UserDataExport {
	request_date: string;
	session: {
		id: string;
		created_at: string;
		expires_at: string;
		location: {
			country: string | null;
			region: string | null;
			city: string | null;
		};
		message_count: number;
		is_active: boolean;
		logging_enabled: boolean;
	};
	messages: Array<{
		id: string;
		role: string;
		content: string;
		timestamp: string;
		model: string | null;
		had_error: boolean;
	}>;
	retrieved_context: Array<{
		chunk_text: string;
		similarity_score: number;
		document_title: string | null;
		rank: number;
		timestamp: string;
	}>;
	metadata: {
		data_categories: string[];
		retention_period: string;
		ip_address_handling: string;
	};
}

const SESSION_ID_MAX_LENGTH = 128;

/**
 * Self-service export/delete window: a session id is echoed back on every
 * /api/v1/query response for chat correlation, so it's a weaker credential
 * than a real auth token. Bounding how long it grants export/delete access
 * limits the damage if one leaks via logs, proxies, or shared screenshots.
 *
 * ChatLogger also uses this window to decide whether to reuse an incoming
 * session id for a multi-turn conversation vs. starting a new session — the
 * same "how long is this id still trustworthy" boundary applies to both.
 */
export const PRIVACY_ACTION_WINDOW_MS = 30 * 60 * 1000;

/**
 * Extract session id from privacy-related headers (supports app + compliance aliases).
 */
export function extractPrivacySessionId(c: Context<AppEnv>): string | null {
	const header =
		c.req.header('x-chat-session-id') ?? c.req.header('X-Session-ID');
	if (!header || header.length === 0 || header.length > SESSION_ID_MAX_LENGTH) {
		return null;
	}
	return header;
}

export function isWithinPrivacyActionWindow(createdAt: number): boolean {
	return Date.now() - createdAt <= PRIVACY_ACTION_WINDOW_MS;
}

function assertWithinPrivacyActionWindow(createdAt: number): void {
	if (!isWithinPrivacyActionWindow(createdAt)) {
		throw new AppError(
			'This session is no longer eligible for self-service export or deletion. Session ids are only valid for self-service actions for 30 minutes after the chat exchange.',
			'SESSION_EXPIRED',
			403,
		);
	}
}

export async function exportUserData(
	sessionId: string,
	env: Env,
): Promise<UserDataExport> {
	if (!env.DATABASE) {
		throw new AppError('Database not configured', 'SERVICE_UNAVAILABLE', 503);
	}

	const session = await env.DATABASE.prepare(
		`SELECT session_id, created_at, expires_at, country, region, city,
            message_count, is_active, logging_enabled, id
     FROM chat_sessions
     WHERE session_id = ?`,
	)
		.bind(sessionId)
		.first<{
			session_id: string;
			created_at: number;
			expires_at: number;
			country: string | null;
			region: string | null;
			city: string | null;
			message_count: number;
			is_active: number;
			logging_enabled: number | null;
			id: string;
		}>();

	if (!session) {
		throw new AppError('Session not found', 'SESSION_NOT_FOUND', 404);
	}
	assertWithinPrivacyActionWindow(session.created_at);

	const messages = await env.DATABASE.prepare(
		`SELECT id, role, content, created_at, model_name, has_error
     FROM chat_messages
     WHERE session_id = ?
     ORDER BY created_at ASC`,
	)
		.bind(session.id)
		.all<{
			id: string;
			role: string;
			content: string;
			created_at: number;
			model_name: string | null;
			has_error: number;
		}>();

	const chunks = await env.DATABASE.prepare(
		`SELECT mc.chunk_text, mc.similarity_score, mc.document_title,
            mc.rank_position, mc.created_at
     FROM message_chunks mc
     JOIN chat_messages cm ON mc.message_id = cm.id
     WHERE cm.session_id = ?
     ORDER BY mc.created_at ASC`,
	)
		.bind(session.id)
		.all<{
			chunk_text: string;
			similarity_score: number;
			document_title: string | null;
			rank_position: number;
			created_at: number;
		}>();

	return {
		request_date: new Date().toISOString(),
		session: {
			id: session.session_id,
			created_at: new Date(session.created_at).toISOString(),
			expires_at: new Date(session.expires_at).toISOString(),
			location: {
				country: session.country,
				region: session.region,
				city: session.city,
			},
			message_count: session.message_count,
			is_active: session.is_active === 1,
			logging_enabled: session.logging_enabled !== 0,
		},
		messages: (messages.results ?? []).map((m) => ({
			id: m.id,
			role: m.role,
			content: m.content,
			timestamp: new Date(m.created_at).toISOString(),
			model: m.model_name,
			had_error: m.has_error === 1,
		})),
		retrieved_context: (chunks.results ?? []).map((c) => ({
			chunk_text: c.chunk_text,
			similarity_score: c.similarity_score,
			document_title: c.document_title,
			rank: c.rank_position,
			timestamp: new Date(c.created_at).toISOString(),
		})),
		metadata: {
			data_categories: [
				'identifiers',
				'geolocation',
				'internet_activity',
				'inferences',
			],
			retention_period: '90 days',
			ip_address_handling: 'SHA-256 hashed with salt (not reversible)',
		},
	};
}

export async function deleteUserData(
	sessionId: string,
	env: Env,
): Promise<void> {
	if (!env.DATABASE) {
		throw new AppError('Database not configured', 'SERVICE_UNAVAILABLE', 503);
	}

	const session = await env.DATABASE.prepare(
		'SELECT id, created_at FROM chat_sessions WHERE session_id = ?',
	)
		.bind(sessionId)
		.first<{ id: string; created_at: number }>();

	if (!session) {
		throw new AppError('Session not found', 'SESSION_NOT_FOUND', 404);
	}
	assertWithinPrivacyActionWindow(session.created_at);

	await env.DATABASE.prepare('DELETE FROM chat_sessions WHERE session_id = ?')
		.bind(sessionId)
		.run();

	await env.DATABASE.prepare(
		`INSERT INTO deletion_log (session_id, deleted_at, reason)
     VALUES (?, ?, 'user_request')`,
	)
		.bind(sessionId, Date.now())
		.run();
}

export async function optOutOfLogging(
	sessionId: string,
	env: Env,
): Promise<void> {
	if (!env.DATABASE) {
		throw new AppError('Database not configured', 'SERVICE_UNAVAILABLE', 503);
	}

	const result = await env.DATABASE.prepare(
		`UPDATE chat_sessions
     SET logging_enabled = 0, updated_at = ?
     WHERE session_id = ?`,
	)
		.bind(Date.now(), sessionId)
		.run();

	if (!result.meta.changes || result.meta.changes === 0) {
		throw new AppError('Session not found', 'SESSION_NOT_FOUND', 404);
	}
}

/**
 * Returns true when the session has opted out of chat logging.
 */
export async function isSessionLoggingOptedOut(
	sessionId: string,
	env: Env,
): Promise<boolean> {
	if (!env.DATABASE) {
		return false;
	}

	const row = await env.DATABASE.prepare(
		'SELECT logging_enabled FROM chat_sessions WHERE session_id = ?',
	)
		.bind(sessionId)
		.first<{ logging_enabled: number | null }>();

	return row !== null && row.logging_enabled === 0;
}
