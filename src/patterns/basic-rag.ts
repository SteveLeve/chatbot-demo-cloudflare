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

export async function basicRAG(
  request: RAGQueryRequest,
  env: Env
): Promise<RAGQueryResponse> {
  const logger = createLogger(
    { pattern: 'basic', question: request.question },
    env.LOG_LEVEL
  );
  logger.startTimer('basicRAG');
  logger.info('Starting basic RAG query');

  const { question, topK = env.DEFAULT_TOP_K, minSimilarity } = request;

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

      return {
        question,
        answer: "I don't have enough information to answer this question based on the available documents.",
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
      temperature: 0.2,
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
    throw error;
  }
}

/**
 * Build system prompt for the LLM
 */
function buildSystemPrompt(context: string): string {
  return `You are a helpful AI assistant that answers questions based on provided context from Wikipedia articles.

IMPORTANT INSTRUCTIONS:
1. Answer the question using ONLY information from the provided context below
2. If the context doesn't contain enough information to answer the question, say "I don't have enough information to answer this question"
3. Always cite your sources using the reference numbers [1], [2], etc. that appear in the context
4. Be concise but comprehensive in your answers
5. Do not make up information or use knowledge outside the provided context

Context:
${context}

Remember: Only use the information provided in the context above to answer questions.`;
}
