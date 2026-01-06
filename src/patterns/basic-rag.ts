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
  DocumentSource,
  EmbeddingResponse,
  GenerationResponse,
} from '../types';
import { createLogger } from '../utils/logger';
import { createDocumentStore } from '../utils/document-store';
import { ChatLogger } from '../utils/chat-logger';
import type { Context } from 'hono';

export async function basicRAG(
  request: RAGQueryRequest,
  env: Env,
  context?: Context<{ Bindings: Env }>
): Promise<RAGQueryResponse> {
  const logger = createLogger(
    { pattern: 'basic', question: request.question },
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
    // Validate question length
    if (question.length > env.MAX_QUERY_LENGTH) {
      throw new Error(`Question exceeds maximum length of ${env.MAX_QUERY_LENGTH} characters`);
    }

    // Step 1: Generate query embedding
    logger.startTimer('generateEmbedding');
    logger.debug('Generating query embedding');

    const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [question],
    }) as EmbeddingResponse;

    const queryEmbedding = embeddingResult.data[0];
    logger.endTimer('generateEmbedding', { dimensions: queryEmbedding?.length });

    if (!queryEmbedding || queryEmbedding.length === 0) {
      throw new Error('Failed to generate query embedding');
    }

    // Step 2: Retrieve similar chunks from Vectorize
    logger.startTimer('retrieveVectors');
    const store = createDocumentStore(env, logger);

    const vectorMatches = await store.queryVectors(
      queryEmbedding,
      topK,
      minSimilarity
    );

    logger.endTimer('retrieveVectors', { matches: vectorMatches.length });

    if (vectorMatches.length === 0) {
      logger.warn('No relevant chunks found');
      const latency = logger.endTimer('basicRAG');
      const answer = "I don't have enough information to answer this question based on the available documents.";

      // Log assistant response
      if (chatLogger) {
        await chatLogger.logMessage({
          role: 'assistant',
          content: answer,
          messageIndex: messageIndex + 1,
          modelName: '@cf/meta/llama-3.1-8b-instruct',
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

    // Step 3: Fetch full chunk text from D1
    logger.startTimer('fetchChunks');
    const chunkIds = vectorMatches.map((m) => m.id);
    const chunks = await store.getChunksWithMetadata(chunkIds);
    logger.endTimer('fetchChunks', { chunks: chunks.length });

    // Step 4: Build context from chunks
    const context = chunks
      .map((chunk, idx) => `[${idx + 1}] ${chunk.text}`)
      .join('\n\n');

    logger.debug('Context built', {
      chunks: chunks.length,
      contextLength: context.length,
    });

    // Step 5: Generate answer
    logger.startTimer('generateAnswer');
    const systemPrompt = buildSystemPrompt(context);

    const generationResult = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0.0,
      max_tokens: 1024,
    }) as GenerationResponse;

    const answer = generationResult.response || 'Unable to generate answer';
    logger.endTimer('generateAnswer', { answerLength: answer.length });

    // Build source citations
    const sources: DocumentSource[] = chunks.map((chunk, idx) => {
      const match = vectorMatches.find((m) => m.id === chunk.id);
      return {
        documentId: chunk.documentId,
        chunkId: chunk.id,
        title: chunk.title,
        chunkText: chunk.text,
        chunkIndex: chunk.chunkIndex,
        similarity: match?.score || 0,
      };
    });

    const latency = logger.endTimer('basicRAG');
    logger.info('Basic RAG query completed', { latencyMs: latency });

    // Log assistant response with sources
    if (chatLogger) {
      await chatLogger.logMessage({
        role: 'assistant',
        content: answer,
        messageIndex: messageIndex + 1,
        modelName: '@cf/meta/llama-3.1-8b-instruct',
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
        retrievedChunks: chunks.length,
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
        modelName: '@cf/meta/llama-3.1-8b-instruct',
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
