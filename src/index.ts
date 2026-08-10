/**
 * Cloudflare RAG Portfolio - Main Application
 * Professional demonstration of RAG patterns on Cloudflare Workers
 *
 * Architecture: Full-stack Workers application
 * - Static assets (React UI) served from public/ directory
 * - API routes (/api/*) handled by Hono
 * - Both components deployed together via single `wrangler deploy`
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { routeAgentRequest } from 'agents';
import type {
	Env,
	RAGQueryRequest,
	ApiResponse,
	IngestionWorkflowParams,
} from './types';
import type { AppEnv } from './types/app-env';
import { basicRAG } from './patterns/basic-rag';
import { createLogger, createRequestLogger } from './utils/logger';
import { checkRateLimit, checkRequestRateLimit } from './utils/rate-limiter';
import { IngestionWorkflow } from './ingestion-workflow';
import { RAGAgent } from './agents/rag-agent';
import {
	getCorsConfig,
	securityHeaders,
	sanitizeError,
} from './utils/security';
import {
	validateTopK,
	validateMinSimilarity,
	sanitizeQuestion,
	validateTitle,
	validateContent,
	validateMetadata,
} from './utils/validation';
import { getStaticEvalReport } from './eval/report-static';
import { runEvalReport } from './eval/runner';
import {
	createTraceContext,
	exportRequestSpan,
	buildTraceparent,
} from './utils/trace';
import { createDocumentStore } from './utils/document-store';

// Export workflows and agents
export { IngestionWorkflow, RAGAgent };

// Create Hono application
const app = new Hono<AppEnv>();

// Request-scoped context: requestId + trace context + headers
app.use('*', async (c, next) => {
	const requestId = crypto.randomUUID();
	const traceContext = createTraceContext(c);
	const start = Date.now();

	c.set('requestId', requestId);
	c.set('traceContext', traceContext);

	await next();

	const end = Date.now();
	// Propagate identifiers to response headers for correlation
	if (!c.res.headers.has('x-request-id')) {
		c.res.headers.set('x-request-id', requestId);
	}
	if (!c.res.headers.has('traceparent')) {
		c.res.headers.set('traceparent', buildTraceparent(traceContext));
	}
	if (traceContext.baggage && !c.res.headers.has('baggage')) {
		c.res.headers.set('baggage', traceContext.baggage);
	}

	// Best-effort OTLP export
	await exportRequestSpan(
		traceContext,
		{
			name: `${c.req.method} ${c.req.path}`,
			startTime: start,
			endTime: end,
			statusCode: c.res.status,
			attributes: {
				'http.host': c.req.header('host') || '',
				'http.user_agent': c.req.header('user-agent') || '',
			},
		},
		c.env,
	);
});

// Apply security headers globally (Issue #10)
app.use('/*', securityHeaders());

// Apply environment-aware CORS (Issue #8)
// In development: allows localhost origins
// In production: restricts to specific domain
app.use('/*', async (c, next) => {
	const corsConfig = getCorsConfig(c.env);
	return cors(corsConfig)(c, next);
});

// ============================================================================
// Health & Info Routes
// ============================================================================

app.get('/', (c) => {
	return c.json({
		name: 'Cloudflare RAG Portfolio',
		version: '0.1.0',
		description:
			'Professional demonstration of RAG patterns on Cloudflare Workers AI',
		endpoints: {
			health: '/health',
			query: '/api/v1/query',
			ingest: '/api/v1/ingest',
			evalReport: '/api/v1/eval/report',
			evalRun: '/api/v1/eval/run',
			docs: '/api/v1/docs',
		},
	});
});

app.get('/health', (c) => {
	return c.json({
		status: 'healthy',
		timestamp: new Date().toISOString(),
		environment: c.env.ENVIRONMENT,
	});
});

// ============================================================================
// RAG Query Routes
// ============================================================================

/**
 * Basic RAG query endpoint
 * GET /api/v1/query?q=<question>&topK=<number>&minSimilarity=<number>
 */
app.get('/api/v1/query', async (c) => {
	const logger = createRequestLogger(c, { endpoint: 'query' });
	const requestId = c.get('requestId') as string | undefined;
	logger.info('Received RAG query request');

	// Apply rate limiting
	const rateLimitResponse = await checkRateLimit(c, c.env.QUERY_RATE_LIMITER, {
		limit: 100,
		window: 60,
		keyPrefix: 'query',
	});
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	try {
		// Parse query parameters
		const question = c.req.query('q');
		const topKStr = c.req.query('topK');
		const minSimilarityStr = c.req.query('minSimilarity');

		// Validate question
		if (!question) {
			return c.json<ApiResponse>(
				{
					success: false,
					error: {
						code: 'MISSING_QUESTION',
						message: 'Query parameter "q" is required',
					},
				},
				400,
			);
		}

		// Sanitize question (Issue #9: prompt injection prevention)
		const sanitizedQuestion = sanitizeQuestion(question);

		// Validate topK if provided
		if (topKStr) {
			const validation = validateTopK(parseInt(topKStr, 10));
			if (!validation.valid) {
				return c.json<ApiResponse>(
					{
						success: false,
						error: validation.error,
					},
					400,
				);
			}
		}

		// Validate minSimilarity if provided
		if (minSimilarityStr) {
			const validation = validateMinSimilarity(parseFloat(minSimilarityStr));
			if (!validation.valid) {
				return c.json<ApiResponse>(
					{
						success: false,
						error: validation.error,
					},
					400,
				);
			}
		}

		// Build request with sanitized question
		const request: RAGQueryRequest = {
			question: sanitizedQuestion,
			topK: topKStr ? parseInt(topKStr, 10) : undefined,
			minSimilarity: minSimilarityStr
				? parseFloat(minSimilarityStr)
				: undefined,
		};

		// Execute basic RAG with context for logging
		const result = await basicRAG(request, c.env, c);

		// Add session cookie to response if logging is enabled
		const response = c.json<ApiResponse>({
			success: true,
			data: result,
			metadata: {
				timestamp: new Date().toISOString(),
				requestId,
			},
		});

		return response;
	} catch (error) {
		logger.error('Query failed', error);

		// Sanitize error for client (Issue #11)
		const sanitizedError = sanitizeError(error, c.env);

		return c.json<ApiResponse>(
			{
				success: false,
				error: sanitizedError,
			},
			500,
		);
	}
});

/**
 * POST endpoint for more complex queries
 * POST /api/v1/query
 * Body: { question: string, topK?: number, minSimilarity?: number }
 */
app.post('/api/v1/query', async (c) => {
	const logger = createRequestLogger(c, { endpoint: 'query-post' });
	const requestId = c.get('requestId') as string | undefined;
	logger.info('Received RAG query POST request');

	// Apply rate limiting
	const rateLimitResponse = await checkRateLimit(c, c.env.QUERY_RATE_LIMITER, {
		limit: 100,
		window: 60,
		keyPrefix: 'query',
	});
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	try {
		const body = await c.req.json<RAGQueryRequest>();

		// Validate question
		if (!body.question) {
			return c.json<ApiResponse>(
				{
					success: false,
					error: {
						code: 'MISSING_QUESTION',
						message: 'Field "question" is required',
					},
				},
				400,
			);
		}

		// Sanitize question (Issue #9: prompt injection prevention)
		const sanitizedQuestion = sanitizeQuestion(body.question);

		// Validate topK if provided
		if (body.topK !== undefined) {
			const validation = validateTopK(body.topK);
			if (!validation.valid) {
				return c.json<ApiResponse>(
					{
						success: false,
						error: validation.error,
					},
					400,
				);
			}
		}

		// Validate minSimilarity if provided
		if (body.minSimilarity !== undefined) {
			const validation = validateMinSimilarity(body.minSimilarity);
			if (!validation.valid) {
				return c.json<ApiResponse>(
					{
						success: false,
						error: validation.error,
					},
					400,
				);
			}
		}

		// Build sanitized request
		const sanitizedBody: RAGQueryRequest = {
			question: sanitizedQuestion,
			topK: body.topK,
			minSimilarity: body.minSimilarity,
		};

		// Execute basic RAG with context for logging
		const result = await basicRAG(sanitizedBody, c.env, c);

		// Add session cookie to response if logging is enabled
		const response = c.json<ApiResponse>({
			success: true,
			data: result,
			metadata: {
				timestamp: new Date().toISOString(),
				requestId,
			},
		});

		return response;
	} catch (error) {
		logger.error('Query failed', error);

		// Sanitize error for client (Issue #11)
		const sanitizedError = sanitizeError(error, c.env);

		return c.json<ApiResponse>(
			{
				success: false,
				error: sanitizedError,
			},
			500,
		);
	}
});

// ============================================================================
// Ingestion Routes
// ============================================================================

/**
 * Ingest a Wikipedia article
 * POST /api/v1/ingest
 * Body: { title: string, content: string, metadata?: object }
 */
app.post('/api/v1/ingest', async (c) => {
	const logger = createRequestLogger(c, { endpoint: 'ingest' });
	const requestId = c.get('requestId') as string | undefined;
	logger.info('Received ingestion request');

	// Apply rate limiting (stricter for expensive operations)
	const rateLimitResponse = await checkRateLimit(c, c.env.INGEST_RATE_LIMITER, {
		limit: 10,
		window: 60,
		keyPrefix: 'ingest',
	});
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	try {
		const body = await c.req.json<{
			title: string;
			content: string;
			metadata?: Record<string, any>;
			id?: string;
			articleId?: string;
		}>();

		// Validate input
		if (!body.title || !body.content) {
			return c.json<ApiResponse>(
				{
					success: false,
					error: {
						code: 'INVALID_INPUT',
						message: 'Fields "title" and "content" are required',
					},
				},
				400,
			);
		}

		// Validate title (Issue #9: length and character validation)
		const titleValidation = validateTitle(body.title);
		if (!titleValidation.valid) {
			return c.json<ApiResponse>(
				{
					success: false,
					error: titleValidation.error,
				},
				400,
			);
		}

		// Validate content (Issue #9: size validation)
		const contentValidation = validateContent(body.content);
		if (!contentValidation.valid) {
			return c.json<ApiResponse>(
				{
					success: false,
					error: contentValidation.error,
				},
				400,
			);
		}

		// Validate metadata if provided (Issue #9: size and security validation)
		if (body.metadata) {
			const metadataValidation = validateMetadata(body.metadata);
			if (!metadataValidation.valid) {
				return c.json<ApiResponse>(
					{
						success: false,
						error: metadataValidation.error,
					},
					400,
				);
			}
		}

		// Create workflow params (stable id from curated corpus when provided)
		const stableId =
			body.id ||
			body.articleId ||
			body.metadata?.['corpusId'] ||
			crypto.randomUUID();

		const params: IngestionWorkflowParams = {
			articleId: stableId,
			title: body.title,
			content: body.content,
			metadata: body.metadata || {},
		};

		// Start the workflow
		const instance = await c.env.INGESTION_WORKFLOW.create({
			params,
		});

		logger.info('Ingestion workflow started', { instanceId: instance.id });

		return c.json<ApiResponse>({
			success: true,
			data: {
				workflowId: instance.id,
				articleId: params.articleId,
				message: 'Ingestion workflow started',
			},
			metadata: {
				timestamp: new Date().toISOString(),
				requestId,
			},
		});
	} catch (error) {
		logger.error('Ingestion failed', error);

		// Sanitize error for client (Issue #11)
		const sanitizedError = sanitizeError(error, c.env);

		return c.json<ApiResponse>(
			{
				success: false,
				error: sanitizedError,
			},
			500,
		);
	}
});

/**
 * Check ingestion workflow status
 * GET /api/v1/ingest/:workflowId
 */
app.get('/api/v1/ingest/:workflowId', async (c) => {
	const logger = createRequestLogger(c, { endpoint: 'ingest-status' });
	const workflowId = c.req.param('workflowId');

	try {
		const instance = await c.env.INGESTION_WORKFLOW.get(workflowId);

		if (!instance) {
			return c.json<ApiResponse>(
				{
					success: false,
					error: {
						code: 'WORKFLOW_NOT_FOUND',
						message: `Workflow ${workflowId} not found`,
					},
				},
				404,
			);
		}

		const status = await instance.status();

		return c.json<ApiResponse>({
			success: true,
			data: {
				workflowId,
				status: status.status,
				output: status.output,
			},
			metadata: {
				timestamp: new Date().toISOString(),
				requestId: c.get('requestId') as string | undefined,
			},
		});
	} catch (error) {
		logger.error('Failed to get workflow status', error);

		// Sanitize error for client (Issue #11)
		const sanitizedError = sanitizeError(error, c.env);

		return c.json<ApiResponse>(
			{
				success: false,
				error: sanitizedError,
			},
			500,
		);
	}
});

// ============================================================================
// Agent Routes (Phase 3 / #34)
// ============================================================================

/**
 * Bootstrap trace ids for the agent trace panel (correlates with Workers logs).
 * GET /api/v1/agent/bootstrap
 */
app.get('/api/v1/agent/bootstrap', (c) => {
	const trace = c.get('traceContext');
	const clientSession = c.req.header('x-chat-session-id');
	const sessionId =
		clientSession && clientSession.length > 0 && clientSession.length <= 128
			? clientSession
			: crypto.randomUUID();

	return c.json<ApiResponse>({
		success: true,
		data: {
			traceId: trace.traceId,
			spanId: trace.spanId,
			sessionId,
			agent: 'RAGAgent',
			agentRoute: `/agents/ragagent/${sessionId}`,
		},
	});
});

// ============================================================================
// Eval Routes (Phase 4 / #35) — demo-scale only
// ============================================================================

/**
 * Committed demo-scale eval report (deterministic; no Workers AI call)
 * GET /api/v1/eval/report
 */
app.get('/api/v1/eval/report', (c) => {
	const logger = createRequestLogger(c, { endpoint: 'eval-report' });
	logger.info('Serving static demo-scale eval report');

	const report = getStaticEvalReport();

	return c.json<ApiResponse>({
		success: true,
		data: report,
		metadata: {
			timestamp: new Date().toISOString(),
			requestId: c.get('requestId') as string | undefined,
		},
	});
});

/**
 * Live demo-scale eval run (rate-limited; ephemeral — does not persist)
 * POST /api/v1/eval/run
 */
app.post('/api/v1/eval/run', async (c) => {
	const logger = createRequestLogger(c, { endpoint: 'eval-run' });
	logger.info('Starting live demo-scale eval run');

	const rateLimitResponse = await checkRateLimit(c, c.env.INGEST_RATE_LIMITER, {
		limit: 5,
		window: 60,
		keyPrefix: 'eval-run',
	});
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	try {
		const report = await runEvalReport(c.env);
		return c.json<ApiResponse>({
			success: true,
			data: report,
			metadata: {
				timestamp: new Date().toISOString(),
				requestId: c.get('requestId') as string | undefined,
			},
		});
	} catch (error) {
		logger.error('Eval run failed', error);
		const sanitizedError = sanitizeError(error, c.env);
		return c.json<ApiResponse>(
			{
				success: false,
				error: sanitizedError,
			},
			500,
		);
	}
});

// ============================================================================
// Corpus Routes
// ============================================================================

/**
 * Get full article body from R2 (ingested curated corpus)
 * GET /api/v1/corpus/:id
 */
app.get('/api/v1/corpus/:id', async (c) => {
	const logger = createRequestLogger(c, { endpoint: 'corpus-get' });
	const articleId = c.req.param('id');

	if (!articleId || articleId.length > 128) {
		return c.json<ApiResponse>(
			{
				success: false,
				error: {
					code: 'INVALID_INPUT',
					message: 'Invalid corpus article id',
				},
			},
			400,
		);
	}

	try {
		const store = createDocumentStore(c.env, logger);
		const article = await store.getArticle(articleId);

		if (!article) {
			return c.json<ApiResponse>(
				{
					success: false,
					error: {
						code: 'NOT_FOUND',
						message:
							'Article not found in storage. Run corpus ingest: npm run ingest ./data/corpus',
					},
				},
				404,
			);
		}

		return c.json<ApiResponse>({
			success: true,
			data: {
				id: article.id,
				title: article.title,
				content: article.content,
				metadata: article.metadata,
				createdAt: article.createdAt,
				updatedAt: article.updatedAt,
			},
		});
	} catch (error) {
		logger.error('Corpus fetch failed', error);
		const sanitizedError = sanitizeError(error, c.env);
		return c.json<ApiResponse>(
			{
				success: false,
				error: sanitizedError,
			},
			500,
		);
	}
});

// ============================================================================
// Documentation Route
// ============================================================================

app.get('/api/v1/docs', (c) => {
	return c.json({
		title: 'Cloudflare RAG Portfolio API',
		version: '1.0.0',
		description: 'API documentation for RAG patterns demonstration',
		patterns: {
			basic: {
				description:
					'Single-turn retrieval-augmented generation (legacy comparison path)',
				endpoint: '/api/v1/query',
				method: 'GET | POST',
				parameters: {
					question: 'The question to answer (required)',
					topK: 'Number of chunks to retrieve (default: 3)',
					minSimilarity: 'Minimum similarity score (0-1)',
				},
			},
			agentic: {
				description:
					'Agents SDK RAG agent with retrieve tool and trace events (WebSocket via /agents/ragagent/:session)',
				bootstrap: '/api/v1/agent/bootstrap',
				websocketRoute: '/agents/ragagent/:sessionId',
				note: 'Use useAgent + useAgentChat from the SPA; pass traceId/spanId from bootstrap in request body',
			},
		},
		ingestion: {
			description: 'Ingest Wikipedia articles using durable workflows',
			endpoint: '/api/v1/ingest',
			method: 'POST',
			body: {
				title: 'Article title (required)',
				content: 'Article content (required)',
				metadata: 'Additional metadata (optional)',
				id: 'Stable article id for curated corpus (optional)',
			},
		},
		corpus: {
			description: 'Fetch full article body from R2 (after ingest)',
			endpoint: '/api/v1/corpus/:id',
			method: 'GET',
			note: 'Article list is static in the SPA manifest (ui/src/content/corpus-manifest.json)',
		},
		eval: {
			description:
				'Demo-scale eval reporting (faithfulness / groundedness / retrieval relevance). Not a production quality claim.',
			report: {
				endpoint: '/api/v1/eval/report',
				method: 'GET',
				note: 'Serves the committed snapshot in data/eval/report.json',
			},
			run: {
				endpoint: '/api/v1/eval/run',
				method: 'POST',
				note: 'Optional live re-run against the gold set; rate-limited; ephemeral (does not write to disk)',
			},
		},
		examples: {
			query: {
				get: '/api/v1/query?q=What%20is%20artificial%20intelligence?&topK=3',
				post: {
					url: '/api/v1/query',
					body: {
						question: 'What is artificial intelligence?',
						topK: 3,
					},
				},
			},
			ingest: {
				url: '/api/v1/ingest',
				body: {
					title: 'Artificial Intelligence',
					content: 'Artificial intelligence (AI) is...',
					metadata: {
						categories: ['Computer Science', 'Technology'],
					},
				},
			},
		},
	});
});

// ============================================================================
// Error Handling
// ============================================================================

app.onError((err, c) => {
	const logger = createRequestLogger(c, { error: true });
	logger.error('Unhandled error', err);

	// Sanitize error for client (Issue #11)
	const sanitizedError = sanitizeError(err, c.env);

	return c.json<ApiResponse>(
		{
			success: false,
			error: sanitizedError,
		},
		500,
	);
});

app.notFound((c) => {
	return c.json<ApiResponse>(
		{
			success: false,
			error: {
				code: 'NOT_FOUND',
				message: 'Endpoint not found',
			},
		},
		404,
	);
});

// ============================================================================
// Scheduled Events (Cron Jobs)
// ============================================================================

/**
 * Cleanup expired chat sessions (runs daily at 2 AM UTC)
 * Marks sessions as inactive if they've expired
 */
async function handleScheduled(_controller: ScheduledController, env: Env) {
	const logger = createLogger({ event: 'scheduled-cleanup' }, env.LOG_LEVEL);

	try {
		logger.info('Starting scheduled cleanup of expired sessions');

		if (!env.DATABASE) {
			logger.warn('Database not available for cleanup');
			return;
		}

		// Mark expired sessions as inactive
		const now = new Date().getTime();
		const result = await env.DATABASE.prepare(
			'UPDATE chat_sessions SET is_active = 0 WHERE expires_at < ? AND is_active = 1',
		)
			.bind(now)
			.run();

		logger.info('Cleanup completed', {
			changedRows: (result as any).meta?.changes || 0,
		});
	} catch (error) {
		logger.error('Scheduled cleanup failed', error);
	}
}

// ============================================================================
// Export
// ============================================================================

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		_ctx: ExecutionContext,
	) {
		await handleScheduled(controller, env);
	},
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname.startsWith('/agents/')) {
			const rateLimitResponse = await checkRequestRateLimit(
				request,
				env.QUERY_RATE_LIMITER,
				{
					limit: 100,
					window: 60,
					keyPrefix: 'agent',
				},
			);
			if (rateLimitResponse) {
				return rateLimitResponse;
			}
		}

		const agentResponse = await routeAgentRequest(request, env);
		if (agentResponse) {
			return agentResponse;
		}

		return app.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
