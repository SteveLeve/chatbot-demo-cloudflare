import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAgent } from 'agents/react';
import { useAgentChat } from '@cloudflare/ai-chat/react';
import { DemoLayout } from '../components/layouts/DemoLayout';
import { ChatInput } from '../components/ChatInput';
import { SourcesCard } from '../components/SourcesCard';
import { TracePanel } from '../components/TracePanel';
import type { TechStackInfo } from '../types/sidebar';
import type { ApiResponse } from '../types';
import type { RAGAgentState } from '../types/agent';
import { getApiUrl } from '../config';

const TECH_STACK: TechStackInfo = {
  title: 'Built with',
  technologies: [
    'Cloudflare Agents SDK',
    'Workers AI (Llama 4 Scout)',
    'Vectorize',
    'D1',
    'Durable Objects',
  ],
  description:
    'Agentic RAG with a retrieve tool, streaming chat, and a step trace panel correlated to Workers logs',
  githubUrl: 'https://github.com/SteveLeve/chatbot-demo-cloudflare',
};

interface BootstrapData {
  traceId: string;
  spanId: string;
  sessionId: string;
  agent: string;
}

function messageText(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('');
}

function getOrCreateSessionId(): string {
  const stored = sessionStorage.getItem('rag-agent-session');
  if (stored) return stored;
  const id = crypto.randomUUID();
  sessionStorage.setItem('rag-agent-session', id);
  return id;
}

function mintSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function AgentChatPage() {
  const [searchParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const traceBodyRef = useRef<{ traceId: string; spanId: string }>({
    traceId: '',
    spanId: '',
  });
  const sessionName = useMemo(() => getOrCreateSessionId(), []);

  const agent = useAgent<RAGAgentState>({
    agent: 'RAGAgent',
    name: sessionName,
    onStateUpdate: (state) => {
      if (state.traceId) {
        traceBodyRef.current.traceId = state.traceId;
      }
      if (state.spanId) {
        traceBodyRef.current.spanId = state.spanId;
      }
    },
  });

  const { messages, sendMessage, status, isStreaming } = useAgentChat({
    agent,
    body: () => ({
      traceId: traceBodyRef.current.traceId,
      spanId: traceBodyRef.current.spanId,
    }),
  });

  useEffect(() => {
    let cancelled = false;

    async function loadBootstrap() {
      setBootstrapLoading(true);
      try {
        const response = await fetch(getApiUrl('/api/v1/agent/bootstrap'), {
          headers: { 'x-chat-session-id': sessionName },
        });
        const data: ApiResponse<BootstrapData> = await response.json();
        if (!data.success || !data.data) {
          throw new Error(data.error?.message || 'Bootstrap failed');
        }
        if (!cancelled) {
          setBootstrap(data.data);
          traceBodyRef.current = {
            traceId: data.data.traceId,
            spanId: data.data.spanId,
          };
          setBootstrapError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setBootstrapError(
            error instanceof Error ? error.message : 'Bootstrap failed'
          );
        }
      } finally {
        if (!cancelled) {
          setBootstrapLoading(false);
        }
      }
    }

    loadBootstrap();
    return () => {
      cancelled = true;
    };
  }, [sessionName]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setInput(q);
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const bootstrapReady = bootstrap !== null && !bootstrapError;

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming || !bootstrapReady) return;

    traceBodyRef.current.spanId = mintSpanId();
    sendMessage({ text });
    setInput('');
  }, [input, isStreaming, sendMessage, bootstrapReady]);

  const agentState = agent.state;
  const traceEvents = agentState?.traceEvents ?? [];
  const lastSources = agentState?.lastSources ?? [];

  return (
    <DemoLayout title="Agentic RAG + Trace" techStack={TECH_STACK}>
      <div className="flex flex-col lg:flex-row h-full min-h-[60vh]">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {bootstrapLoading && (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Connecting trace context…
              </div>
            )}

            {bootstrapError && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                Trace bootstrap failed: {bootstrapError}
              </div>
            )}

            {messages.length === 0 && bootstrapReady && (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-16">
                <p className="text-lg">Ask the agent about the curated corpus</p>
                <p className="text-sm mt-2 max-w-md mx-auto">
                  The agent calls a <code className="text-xs">retrieve_from_corpus</code> tool,
                  then generates a cited answer. Watch the trace panel for each step.
                </p>
                <p className="text-sm mt-2">
                  <Link
                    to="/docs/corpus"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Browse the corpus
                  </Link>
                  {' · '}
                  <Link
                    to="/demos/basic-rag"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Compare basic RAG
                  </Link>
                </p>
              </div>
            )}

            {messages.map((message) => {
              const text = messageText(message.parts);
              const isUser = message.role === 'user';
              const assistantMessages = messages.filter((m) => m.role === 'assistant');
              const lastAssistantId = assistantMessages[assistantMessages.length - 1]?.id;
              const isLatestAssistant = !isUser && message.id === lastAssistantId;

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-4 ${
                      isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{text}</div>
                    {isLatestAssistant && lastSources.length > 0 && (
                      <SourcesCard sources={lastSources} />
                    )}
                  </div>
                </div>
              );
            })}

            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-gray-500 dark:text-gray-400 animate-pulse">
                  Agent working…
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              disabled={
                !bootstrapReady ||
                bootstrapLoading ||
                isStreaming ||
                status === 'submitted'
              }
              placeholder={
                bootstrapReady
                  ? 'Ask about the corpus…'
                  : 'Waiting for trace bootstrap…'
              }
            />
          </div>
        </div>

        <TracePanel
          events={traceEvents}
          traceId={agentState?.traceId ?? bootstrap?.traceId}
          spanId={agentState?.spanId ?? bootstrap?.spanId}
        />
      </div>
    </DemoLayout>
  );
}
