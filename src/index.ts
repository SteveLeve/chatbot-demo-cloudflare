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
import type { Env, RAGQueryRequest, ApiResponse, IngestionWorkflowParams } from './types';
import { basicRAG } from './patterns/basic-rag';
import { createLogger } from './utils/logger';
import { IngestionWorkflow } from './ingestion-workflow';
import type { ExecutionContext, ScheduledEvent, ExportedHandler } from 'cloudflare:workers';

// Export the ingestion workflow
export { IngestionWorkflow };

// Create Hono application
const app = new Hono<{ Bindings: Env }>();

// Enable CORS for external API access
// Note: Frontend is served from same Worker origin, so no CORS needed for frontend->API
// CORS enabled for external clients and integrations
app.use('/*', cors());

// ============================================================================
// Health & Info Routes
// ============================================================================

app.get('/', (c) => {
  return c.json({
    name: 'Cloudflare RAG Portfolio',
    version: '0.1.0',
    description: 'Professional demonstration of RAG patterns on Cloudflare Workers AI',
    endpoints: {
      health: '/health',
      query: '/api/v1/query',
      ingest: '/api/v1/ingest',
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
  const logger = createLogger({ endpoint: 'query' }, c.env.LOG_LEVEL);
  logger.info('Received RAG query request');

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
        400
      );
    }

    // Build request
    const request: RAGQueryRequest = {
      question,
      topK: topKStr ? parseInt(topKStr, 10) : undefined,
      minSimilarity: minSimilarityStr ? parseFloat(minSimilarityStr) : undefined,
    };

    // Execute basic RAG with context for logging
    const result = await basicRAG(request, c.env, c);

    // Add session cookie to response if logging is enabled
    const response = c.json<ApiResponse>({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });

    return response;
  } catch (error) {
    logger.error('Query failed', error);

    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    );
  }
});

/**
 * POST endpoint for more complex queries
 * POST /api/v1/query
 * Body: { question: string, topK?: number, minSimilarity?: number }
 */
app.post('/api/v1/query', async (c) => {
  const logger = createLogger({ endpoint: 'query-post' }, c.env.LOG_LEVEL);
  logger.info('Received RAG query POST request');

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
        400
      );
    }

    // Execute basic RAG with context for logging
    const result = await basicRAG(body, c.env, c);

    // Add session cookie to response if logging is enabled
    const response = c.json<ApiResponse>({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });

    return response;
  } catch (error) {
    logger.error('Query failed', error);

    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
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
  const logger = createLogger({ endpoint: 'ingest' }, c.env.LOG_LEVEL);
  logger.info('Received ingestion request');

  try {
    const body = await c.req.json<{
      title: string;
      content: string;
      metadata?: Record<string, any>;
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
        400
      );
    }

    // Create workflow params
    const params: IngestionWorkflowParams = {
      articleId: crypto.randomUUID(),
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
      },
    });
  } catch (error) {
    logger.error('Ingestion failed', error);

    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'INGESTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    );
  }
});

/**
 * Check ingestion workflow status
 * GET /api/v1/ingest/:workflowId
 */
app.get('/api/v1/ingest/:workflowId', async (c) => {
  const logger = createLogger({ endpoint: 'ingest-status' }, c.env.LOG_LEVEL);
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
        404
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
      },
    });
  } catch (error) {
    logger.error('Failed to get workflow status', error);

    return c.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
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
        description: 'Single-turn retrieval-augmented generation',
        endpoint: '/api/v1/query',
        method: 'GET | POST',
        parameters: {
          question: 'The question to answer (required)',
          topK: 'Number of chunks to retrieve (default: 3)',
          minSimilarity: 'Minimum similarity score (0-1)',
        },
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
  const logger = createLogger({ error: true }, c.env.LOG_LEVEL);
  logger.error('Unhandled error', err);

  return c.json<ApiResponse>(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred',
      },
    },
    500
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
    404
  );
});

// ============================================================================
// Scheduled Events (Cron Jobs)
// ============================================================================

/**
 * Cleanup expired chat sessions (runs daily at 2 AM UTC)
 * Marks sessions as inactive if they've expired
 */
async function handleScheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
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
      'UPDATE chat_sessions SET is_active = 0 WHERE expires_at < ? AND is_active = 1'
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
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    await handleScheduled(event, env, ctx);
  },
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
