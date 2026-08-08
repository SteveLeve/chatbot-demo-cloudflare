import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { DemoLayout } from '../components/layouts/DemoLayout';
import type { ChatMessage } from '../types/chat';
import type { RAGQueryResponse, ApiResponse } from '../types';
import type { TechStackInfo } from '../types/sidebar';
import { getApiUrl } from '../config';

const TECH_STACK: TechStackInfo = {
  title: 'Built with',
  technologies: ['Cloudflare Workers AI', 'Vectorize', 'D1', 'R2', 'React Router v7'],
  description: 'Demonstrating RAG patterns on the edge with Cloudflare',
  githubUrl: 'https://github.com/SteveLeve/chatbot-demo-cloudflare'
};

export function BasicChatPage() {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Glossary / corpus links inject ?q= prompt
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setInput(q);
  }, [searchParams]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl(`/api/v1/query?q=${encodeURIComponent(input)}`));
      const data: ApiResponse<RAGQueryResponse> = await response.json();

      if (data.success && data.data) {
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.data.answer,
          sources: data.data.sources,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error?.message || 'Query failed');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemoLayout
      title="Basic RAG Chatbot"
      techStack={TECH_STACK}
      footer={
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={loading}
        />
      }
    >
      <div className="p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
            <p className="text-lg">Ask about the curated demo corpus</p>
            <p className="text-sm mt-2">
              Try: &quot;What is artificial intelligence?&quot; or browse{' '}
              <Link to="/docs/corpus" className="text-blue-600 dark:text-blue-400 hover:underline">
                what&apos;s in the corpus
              </Link>
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-gray-500 dark:text-gray-400 animate-pulse">
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </DemoLayout>
  );
}
