/**
 * Agents SDK RAG agent — tool loop with transparent trace events.
 * Phase 3 / #34.
 */

import { AIChatAgent } from '@cloudflare/ai-chat';
import type { Connection } from 'agents';
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
} from 'ai';
import { z } from 'zod';
import type { Env } from '../types';
import type { RAGAgentState } from '../types/agent-wire';
import type { TraceEvent } from '../types/trace';
import { GENERATION_MODEL } from '../config/models';
import { createWorkersAIModel } from '../ai/workers-ai';
import { runRetrieveFromCorpusTool } from './rag-agent-tools';
import { createLogger } from '../utils/logger';

const MAX_TRACE_EVENTS = 100;
const MAX_PERSISTED_MESSAGES = 50;

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

  maxPersistedMessages = MAX_PERSISTED_MESSAGES;

  validateStateChange(nextState: RAGAgentState, source: Connection | 'server'): void {
    if (source === 'server') return;

    const traceEventsMatch =
      JSON.stringify(nextState.traceEvents) === JSON.stringify(this.state.traceEvents);
    const sourcesMatch =
      JSON.stringify(nextState.lastSources) === JSON.stringify(this.state.lastSources);

    if (
      !traceEventsMatch ||
      !sourcesMatch ||
      nextState.traceId !== this.state.traceId ||
      nextState.spanId !== this.state.spanId
    ) {
      throw new Error('Trace and retrieval state is server-owned');
    }
  }

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

    this.setState({
      ...this.state,
      traceId,
      spanId,
      lastSources: [],
    });

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
    const maxQueryLength = this.env.MAX_QUERY_LENGTH;

    const retrieveTool = tool({
      description:
        'Search the curated demo corpus for document chunks relevant to a query. Always call this before answering factual questions.',
      inputSchema: z.object({
        query: z
          .string()
          .max(maxQueryLength)
          .describe('Search query — usually the user question or a focused sub-query'),
        topK: z.number().int().min(1).max(10).optional(),
      }),
      execute: async ({ query, topK }) => {
        const toolResult = await runRetrieveFromCorpusTool(
          query,
          topK ?? this.env.DEFAULT_TOP_K,
          this.env,
          {
            onRetrieveStart: (summary) => {
              this.pushTrace({
                type: 'retrieve',
                summary,
                timestamp: Date.now(),
              });
            },
            onRetrieveEmpty: (q) => {
              this.pushTrace({
                type: 'guard',
                summary: 'No corpus chunks matched — agent should refuse or ask to rephrase',
                detail: { query: q, matchCount: 0 },
                timestamp: Date.now(),
              });
            },
            onRetrieveHit: (detail) => {
              this.pushTrace({
                type: 'retrieve',
                summary: `Retrieved ${detail.chunkIds?.length ?? 0} chunk(s)`,
                detail,
                timestamp: Date.now(),
              });
            },
          },
          {
            traceId: this.state.traceId,
            spanId: this.state.spanId,
          }
        );

        this.setState({
          ...this.state,
          lastSources: toolResult.sources,
        });

        logger.info('Retrieve tool completed', {
          chunkCount: toolResult.chunkCount,
        });

        return toolResult.contextText;
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
