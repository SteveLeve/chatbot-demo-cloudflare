/**
 * Basic RAG Pattern
 * Single-turn retrieval-augmented generation
 *
 * Flow:
 * 1. Generate query embedding
 * 2. Retrieve top-K similar chunks from Vectorize
 * 3. Fetch full chunk text from D1
 * 4. Build context from chunks
 * 5. Generate answer using LLM with context
 */

import type {
  Env,
  RAGQueryRequest,
  RAGQueryResponse,
  GenerationResponse,
} from '../types';
import { createLogger } from '../utils/logger';
import { ChatLogger } from '../utils/chat-logger';
import type { Context } from 'hono';
import { validateTopK, validateMinSimilarity, sanitizeQuestion } from '../utils/validation';
import type { TraceContext } from '../utils/trace';
import { GENERATION_MODEL } from '../config/models';
import { retrieveFromCorpus } from '../utils/retrieval';

export async function basicRAG(
  request: RAGQueryRequest,
  env: Env,
  context?: Context<{ Bindings: Env }>
): Promise<RAGQueryResponse> {
  const requestId = context?.get('requestId') as string | undefined;
  const trace = context?.get('traceContext') as TraceContext | undefined;

  const logger = createLogger(
    {
      pattern: 'basic',
      question: request.question,
      requestId,
      traceId: trace?.traceId,
      spanId: trace?.spanId,
    },
    env.LOG_LEVEL
  );
  logger.startTimer('basicRAG');
  logger.info('Starting basic RAG query');

  const { question, topK = env.DEFAULT_TOP_K, minSimilarity } = request;

  // Initialize chat logger if context is provided
  let chatLogger: ChatLogger | null = null;
  let messageIndex = 0;

  if (context) {
    chatLogger = new ChatLogger(env, context);
    await chatLogger.initializeSession();

    // Log user message
    messageIndex = 0;
    await chatLogger.logMessage({
      role: 'user',
      content: question,
      messageIndex,
    });
  }

  try {
    // Defense-in-depth validation: Validate topK (should already be validated at API boundary)
    if (topK !== env.DEFAULT_TOP_K) {
      const validation = validateTopK(topK);
      if (!validation.valid) {
        throw new Error(validation.error?.message || 'Invalid topK parameter');
      }
    }

    // Defense-in-depth validation: Validate minSimilarity if provided
    if (minSimilarity !== undefined) {
      const validation = validateMinSimilarity(minSimilarity);
      if (!validation.valid) {
        throw new Error(validation.error?.message || 'Invalid minSimilarity parameter');
      }
    }

    // Validate question length
    if (question.length > env.MAX_QUERY_LENGTH) {
      throw new Error(`Question exceeds maximum length of ${env.MAX_QUERY_LENGTH} characters`);
    }

    // Defense-in-depth: Sanitize question (already sanitized at API boundary, but check again)
    const sanitizedQuestion = sanitizeQuestion(question);

    // Retrieve via shared corpus helper (embedding + Vectorize + D1)
    logger.startTimer('retrieve');
    const retrieval = await retrieveFromCorpus(sanitizedQuestion, env, {
      topK,
      minSimilarity,
      traceId: trace?.traceId,
      spanId: trace?.spanId,
    });
    logger.endTimer('retrieve', { matches: retrieval.chunks.length });

    if (retrieval.chunks.length === 0) {
      logger.warn('No relevant chunks found');
      const latency = logger.endTimer('basicRAG');
      const answer = "I don't have enough information to answer this question based on the available documents.";

      // Log assistant response
      if (chatLogger) {
        await chatLogger.logMessage({
          role: 'assistant',
          content: answer,
          messageIndex: messageIndex + 1,
          modelName: GENERATION_MODEL,
          latencyMs: latency,
          sources: [],
        });
      }

      return {
        question,
        answer,
        sources: [],
        metadata: {
          pattern: 'basic',
          latencyMs: latency,
          retrievedChunks: 0,
        },
      };
    }

    const context = retrieval.sources
      .map((source, idx) => `[${idx + 1}] ${source.chunkText}`)
      .join('\n\n');

    logger.debug('Context built', {
      chunks: retrieval.chunks.length,
      contextLength: context.length,
    });

    // Generate answer
    logger.startTimer('generateAnswer');
    const systemPrompt = buildSystemPrompt(context);

    const generationResult = await env.AI.run(GENERATION_MODEL, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0.0,
      max_tokens: 1024,
    }, env.USE_AI_GATEWAY && env.AI_GATEWAY_ID ? {
      gateway: { id: env.AI_GATEWAY_ID },
    } : undefined) as GenerationResponse;

    const answer = generationResult.response || 'Unable to generate answer';
    logger.endTimer('generateAnswer', { answerLength: answer.length });

    // Build source citations (from shared retrieval)
    const sources = retrieval.sources;

    const latency = logger.endTimer('basicRAG');
    logger.info('Basic RAG query completed', { latencyMs: latency });

    // Log assistant response with sources
    if (chatLogger) {
      await chatLogger.logMessage({
        role: 'assistant',
        content: answer,
        messageIndex: messageIndex + 1,
        modelName: GENERATION_MODEL,
        latencyMs: latency,
        sources,
      });
    }

    return {
      question,
      answer,
      sources,
      metadata: {
        pattern: 'basic',
        latencyMs: latency,
        retrievedChunks: retrieval.chunks.length,
      },
    };
  } catch (error) {
    logger.error('Basic RAG query failed', error);

    // Log error if chat logger is available
    if (chatLogger) {
      await chatLogger.logMessage({
        role: 'assistant',
        content: '',
        messageIndex: messageIndex + 1,
        modelName: GENERATION_MODEL,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    throw error;
  }
}

/**
 * Build system prompt for the LLM
 */
function buildSystemPrompt(context: string): string {
  return `You are a strict document retrieval system. You have ZERO knowledge beyond what appears in the context below.

<CONTEXT>
${context}
</CONTEXT>

CRITICAL RULES (NEVER VIOLATE):
1. You ONLY know information within the <CONTEXT> tags above
2. IGNORE all knowledge from your training data
3. If the context does not contain the answer, you MUST respond: "I cannot answer this question based on the provided documents."
4. EVERY claim in your answer must be followed by a citation [N] from the context
5. Do NOT paraphrase beyond the context—quote or closely paraphrase the source text
6. Do NOT make logical inferences unless explicitly stated in the context

HOW TO ANSWER:
- First, identify which documents [1], [2], etc. contain relevant information
- Then, construct your answer using ONLY those specific references
- Include citation [N] after each claim
- If information is incomplete, acknowledge the gaps rather than filling them

EXAMPLES:
✓ CORRECT: "The article states that AI was founded in 1956 [1]."
✗ WRONG: "AI was founded in 1956, which marked a major technological shift." (added inference)

Remember: If you use ANY information not explicitly in the context, you have failed.`;
}
