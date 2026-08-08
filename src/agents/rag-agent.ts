/**
 * Agents SDK RAG agent — tool loop with transparent trace events.
 * Phase 3 / #34.
 */

import { AIChatAgent } from '@cloudflare/ai-chat';
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
} from 'ai';
import { z } from 'zod';
import type { Env, DocumentSource } from '../types';
import type { TraceEvent } from '../types/trace';
import { GENERATION_MODEL } from '../config/models';
import { createWorkersAIModel } from '../ai/workers-ai';
import { retrieveFromCorpus } from '../utils/retrieval';
import { createLogger } from '../utils/logger';

export interface RAGAgentState {
  traceEvents: TraceEvent[];
  traceId?: string;
  spanId?: string;
  lastSources: DocumentSource[];
}

const MAX_TRACE_EVENTS = 100;

function buildAgentSystemPrompt(): string {
  return `You are a retrieval-augmented assistant for a curated demo corpus (~37 Wikipedia articles).

WORKFLOW:
1. Call retrieve_from_corpus with the user's question (or a focused sub-query).
2. Answer using ONLY the returned chunks. Cite sources as [N] matching chunk numbers.
3. If retrieval returns no relevant chunks, say you cannot answer from the corpus.

RULES:
- Never use knowledge outside retrieved chunks.
- Every factual claim needs a [N] citation from the retrieval results.
- Be concise and educational — this is a portfolio demo of agentic RAG on Cloudflare.`;
}

export class RAGAgent extends AIChatAgent<Env, RAGAgentState> {
  initialState: RAGAgentState = {
    traceEvents: [],
    lastSources: [],
  };

  private pushTrace(event: Omit<TraceEvent, 'traceId' | 'spanId'>): void {
    const entry: TraceEvent = {
      ...event,
      traceId: this.state.traceId,
      spanId: this.state.spanId,
    };

    const traceEvents = [...this.state.traceEvents, entry].slice(-MAX_TRACE_EVENTS);
    this.setState({
      ...this.state,
      traceEvents,
    });
  }

  async onChatMessage(onFinish, options) {
    const body = options?.body ?? {};
    const traceId = typeof body.traceId === 'string' ? body.traceId : undefined;
    const spanId = typeof body.spanId === 'string' ? body.spanId : undefined;

    if (traceId) {
      this.setState({
        ...this.state,
        traceId,
        spanId,
      });
    }

    const logger = createLogger(
      {
        agent: 'RAGAgent',
        traceId: this.state.traceId,
        spanId: this.state.spanId,
        requestId: options?.requestId,
      },
      this.env.LOG_LEVEL
    );

    this.pushTrace({
      type: 'generate',
      summary: 'Agent turn started',
      timestamp: Date.now(),
    });

    const workersai = createWorkersAIModel(this.env);

    const retrieveTool = tool({
      description:
        'Search the curated demo corpus for document chunks relevant to a query. Always call this before answering factual questions.',
      inputSchema: z.object({
        query: z.string().describe('Search query — usually the user question or a focused sub-query'),
        topK: z.number().int().min(1).max(10).optional(),
      }),
      execute: async ({ query, topK }) => {
        this.pushTrace({
          type: 'retrieve',
          summary: `Retrieving chunks for "${query.slice(0, 80)}${query.length > 80 ? '…' : ''}"`,
          timestamp: Date.now(),
        });

        const result = await retrieveFromCorpus(query, this.env, {
          topK: topK ?? this.env.DEFAULT_TOP_K,
          traceId: this.state.traceId,
          spanId: this.state.spanId,
        });

        if (result.chunks.length === 0) {
          this.pushTrace({
            type: 'guard',
            summary: 'No corpus chunks matched — agent should refuse or ask to rephrase',
            detail: { query, matchCount: 0 },
            timestamp: Date.now(),
          });
        } else {
          this.pushTrace({
            type: 'retrieve',
            summary: `Retrieved ${result.chunks.length} chunk(s)`,
            detail: {
              titles: result.chunks.map((c) => c.title),
              scores: result.chunks.map((c) => c.similarity),
              chunkIds: result.chunks.map((c) => c.id),
            },
            timestamp: Date.now(),
          });
        }

        this.setState({
          ...this.state,
          lastSources: result.sources,
        });

        logger.info('Retrieve tool completed', {
          chunkCount: result.chunks.length,
        });

        return result.contextText;
      },
    });

    const result = streamText({
      model: workersai(GENERATION_MODEL),
      system: buildAgentSystemPrompt(),
      messages: await convertToModelMessages(this.messages),
      tools: {
        retrieve_from_corpus: retrieveTool,
      },
      stopWhen: stepCountIs(5),
      temperature: 0,
      maxOutputTokens: 1024,
      abortSignal: options?.abortSignal,
      onStepFinish: (step) => {
        if (step.toolCalls?.length) {
          for (const call of step.toolCalls) {
            this.pushTrace({
              type: 'tool',
              summary: `Tool call: ${call.toolName}`,
              detail: { toolName: call.toolName },
              timestamp: Date.now(),
            });
          }
        }
      },
      onFinish: (event) => {
        this.pushTrace({
          type: 'generate',
          summary: 'Answer generated',
          detail: {
            finishReason: event.finishReason,
            steps: event.steps?.length ?? 0,
          },
          timestamp: Date.now(),
        });
        logger.info('Agent turn completed', {
          finishReason: event.finishReason,
        });
        onFinish(event);
      },
    });

    return result.toUIMessageStreamResponse();
  }
}
