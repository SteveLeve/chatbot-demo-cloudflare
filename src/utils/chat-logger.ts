/**
 * Chat logging service for conversation governance
 * Logs sessions, messages, and RAG retrieval chunks to D1 database
 */

import type { Context } from 'hono';
import type { Env, DocumentSource } from '../types';
import { hashIpAddress } from './privacy';
import { extractCloudflareMetadata, extractIpAddress } from './metadata';
import { getOrCreateSessionId, createSessionCookie } from './session-manager';

// Enable/disable logging via environment variable
const LOGGING_ENABLED_DEFAULT = true;

export interface LogChatMessageParams {
  role: 'user' | 'assistant';
  content: string;
  messageIndex: number;

  // Assistant-specific metadata
  modelName?: string;
  temperature?: number;
  latencyMs?: number;
  tokenCount?: number;
  promptTokens?: number;
  completionTokens?: number;

  // RAG sources (for assistant messages)
  sources?: DocumentSource[];

  // Error tracking
  hasError?: boolean;
  errorMessage?: string;
}

export class ChatLogger {
  private sessionId: string | null = null;
  private sessionDbId: string | null = null;
  private env: Env;
  private context: Context<{ Bindings: Env }>;
  private loggingEnabled: boolean;

  constructor(env: Env, context: Context<{ Bindings: Env }>) {
    this.env = env;
    this.context = context;

    // Check if logging is enabled (default: true if not specified)
    const vars = (env as any).vars || {};
    this.loggingEnabled = vars.CHAT_LOGGING_ENABLED !== false;
  }

  /**
   * Initialize session for the request
   * Creates or retrieves existing session from database
   * Logs errors but does not throw (logging should not break chat)
   */
  async initializeSession(): Promise<void> {
    if (!this.loggingEnabled || !this.env.DATABASE) {
      return;
    }

    try {
      this.sessionId = getOrCreateSessionId(this.context.req.raw);

      // Check if session already exists in DB
      const existingSessionResult = await this.env.DATABASE.prepare(
        'SELECT id FROM chat_sessions WHERE session_id = ?'
      )
        .bind(this.sessionId)
        .first();

      if (existingSessionResult) {
        const id = existingSessionResult.id;
        if (!id || typeof id !== 'string') {
          console.warn('[ChatLogger] Existing session query returned invalid ID format', {
            id,
            type: typeof id,
          });
          this.sessionDbId = null;
          return;
        }
        this.sessionDbId = id;

        // Update last_message_at
        await this.env.DATABASE.prepare(
          'UPDATE chat_sessions SET last_message_at = ?, updated_at = ? WHERE id = ?'
        )
          .bind(new Date().getTime(), new Date().getTime(), this.sessionDbId)
          .run();
      } else {
        // Create new session (this will validate the result)
        this.sessionDbId = await this.createSession();
      }
    } catch (error) {
      console.error('[ChatLogger] Failed to initialize session:', error instanceof Error ? error.message : String(error), {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        sessionId: this.sessionId,
      });
      // Don't throw - logging failures shouldn't break chat functionality
      this.sessionDbId = null;
    }
  }

  /**
   * Create a new session record in database
   * Throws error if session creation fails (caller handles)
   */
  private async createSession(): Promise<string> {
    const ip = extractIpAddress(this.context);
    const ipSalt = ((this.env as any).vars?.CHAT_LOG_IP_SALT as string) || 'default-salt';
    const ipHash = await hashIpAddress(ip, ipSalt);
    const metadata = extractCloudflareMetadata(this.context);

    // Generate new session ID if not already set
    if (!this.sessionId) {
      this.sessionId = crypto.randomUUID();
    }

    // Calculate expiration (90 days from now in milliseconds)
    const expiresAt = new Date().getTime() + 90 * 24 * 60 * 60 * 1000;

    const result = await this.env.DATABASE.prepare(
      `INSERT INTO chat_sessions (
        id, session_id, ip_hash, user_agent, country, region, city,
        latitude, longitude, timezone, colo, asn, created_at, updated_at,
        last_message_at, is_active, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id`
    )
      .bind(
        crypto.randomUUID(), // id
        this.sessionId, // session_id
        ipHash, // ip_hash
        metadata.userAgent, // user_agent
        metadata.country, // country
        metadata.region, // region
        metadata.city, // city
        metadata.lat, // latitude
        metadata.lng, // longitude
        metadata.timezone, // timezone
        metadata.colo, // colo
        metadata.asn, // asn
        new Date().getTime(), // created_at (Unix milliseconds)
        new Date().getTime(), // updated_at
        new Date().getTime(), // last_message_at
        1, // is_active (SQLite: 1 = true)
        expiresAt // expires_at
      )
      .first();

    // Validate result exists and has id field
    if (!result || typeof result !== 'object') {
      throw new Error(`Session insert returned invalid result: ${result}`);
    }

    const sessionId = (result as any).id;
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error(`Session insert returned no ID or invalid ID type: ${sessionId}`);
    }

    return sessionId;
  }

  /**
   * Log a chat message (user or assistant)
   * CRITICAL: Message insert is essential and failures are logged with context
   * BEST-EFFORT: Chunk logging is supplementary, failures are logged but don't propagate
   */
  async logMessage(params: LogChatMessageParams): Promise<void> {
    if (!this.loggingEnabled || !this.sessionDbId || !this.env.DATABASE) {
      return;
    }

    // CRITICAL: Insert message - this is the core logging operation
    let messageId: string;
    try {
      const messageResult = await this.env.DATABASE.prepare(
        `INSERT INTO chat_messages (
          id, session_id, role, content, message_index, model_name,
          temperature, latency_ms, token_count, prompt_tokens, completion_tokens,
          has_error, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id`
      )
        .bind(
          crypto.randomUUID(), // id
          this.sessionDbId, // session_id
          params.role, // role
          params.content, // content
          params.messageIndex, // message_index
          params.modelName || null, // model_name
          params.temperature || null, // temperature (stored as numeric in DB)
          params.latencyMs || null, // latency_ms
          params.tokenCount || null, // token_count
          params.promptTokens || null, // prompt_tokens
          params.completionTokens || null, // completion_tokens
          params.hasError ? 1 : 0, // has_error (SQLite boolean)
          params.errorMessage || null, // error_message
          new Date().getTime() // created_at (Unix milliseconds)
        )
        .first();

      // Validate message insert result
      if (!messageResult || typeof messageResult !== 'object') {
        throw new Error(`Message insert returned invalid result: ${messageResult}`);
      }

      const id = (messageResult as any).id;
      if (!id || typeof id !== 'string') {
        throw new Error(`Message insert returned no ID or invalid ID type: ${id}`);
      }

      messageId = id;
    } catch (error) {
      console.error('[ChatLogger] CRITICAL: Failed to log chat message', error instanceof Error ? error.message : String(error), {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        sessionId: this.sessionDbId,
        role: params.role,
        messageIndex: params.messageIndex,
        contentLength: params.content.length,
      });
      // Don't throw - logging shouldn't break chat, but don't continue with subsequent operations
      return;
    }

    // BEST-EFFORT: Log RAG chunks if this is an assistant message with sources
    if (params.role === 'assistant' && params.sources && params.sources.length > 0) {
      try {
        await this.logMessageChunks(messageId, params.sources);
      } catch (error) {
        console.warn('[ChatLogger] Failed to log RAG chunks (non-critical)', error instanceof Error ? error.message : String(error), {
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
          messageId,
          chunkCount: params.sources.length,
        });
        // Don't propagate - chunks are supplementary to message logging
      }
    }

    // CRITICAL: Update session message count and last_message_at
    try {
      await this.env.DATABASE.prepare(
        `UPDATE chat_sessions
         SET message_count = message_count + 1,
             last_message_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
        .bind(new Date().getTime(), new Date().getTime(), this.sessionDbId)
        .run();
    } catch (error) {
      console.error('[ChatLogger] Failed to update session message count', error instanceof Error ? error.message : String(error), {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        sessionId: this.sessionDbId,
        messageId,
      });
      // Don't throw - session update failure is non-critical after message is logged
    }
  }

  /**
   * Log RAG chunks associated with a message
   * Handles failures per-chunk and logs detailed information about which chunks failed
   * Throws error if all chunks fail, to allow caller to handle critical failures
   */
  private async logMessageChunks(messageId: string, sources: DocumentSource[]): Promise<void> {
    const failedChunks: { index: number; error: string; chunkId?: string }[] = [];
    const successfulChunks: number[] = [];

    // Insert each chunk individually (D1 doesn't support batch inserts easily)
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];

      try {
        // Validate similarity score is in valid range
        if (source.similarity < 0 || source.similarity > 1 || !isFinite(source.similarity)) {
          throw new Error(`Invalid similarity score: ${source.similarity} (must be between 0 and 1)`);
        }

        await this.env.DATABASE.prepare(
          `INSERT INTO message_chunks (
            id, message_id, document_id, chunk_id, chunk_text,
            similarity_score, rank_position, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            crypto.randomUUID(), // id
            messageId, // message_id
            source.documentId || null, // document_id
            source.chunkId, // chunk_id
            source.chunkText, // chunk_text
            source.similarity, // similarity_score (stored as REAL/numeric)
            i + 1, // rank_position
            new Date().getTime() // created_at
          )
          .run();

        successfulChunks.push(i);
      } catch (error) {
        failedChunks.push({
          index: i,
          error: error instanceof Error ? error.message : String(error),
          chunkId: source.chunkId,
        });
      }
    }

    // Log detailed report of chunk logging results
    if (failedChunks.length > 0) {
      const failureRate = ((failedChunks.length / sources.length) * 100).toFixed(1);
      const summary = `Failed to log ${failedChunks.length}/${sources.length} chunks (${failureRate}%)`;

      if (failedChunks.length === sources.length) {
        // All chunks failed
        throw new Error(`${summary} - all RAG chunks failed to log`);
      } else {
        // Partial failure
        console.warn('[ChatLogger] Partial chunk logging failure', {
          messageId,
          summary,
          successCount: successfulChunks.length,
          failureCount: failedChunks.length,
          failedChunks: failedChunks.slice(0, 5), // Log first 5 failures
          failedChunkIds: failedChunks.map(f => f.chunkId).slice(0, 5),
        });
      }
    }
  }

  /**
   * Get session ID (for returning to client if needed)
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get session cookie string for Set-Cookie header
   */
  getSessionCookie(): string {
    if (!this.sessionId) {
      return '';
    }
    return createSessionCookie(this.sessionId);
  }
}
