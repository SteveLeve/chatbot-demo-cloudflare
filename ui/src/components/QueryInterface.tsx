import { useState } from 'react';
import type { RAGQueryResponse, ApiResponse } from '../types';
import { getApiUrl } from '../config';

export function QueryInterface() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RAGQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(getApiUrl(`/api/v1/query?q=${encodeURIComponent(question)}`));
      const data: ApiResponse<RAGQueryResponse> = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.error?.message || 'Query failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Wikipedia RAG Demo
        </h1>
        <p className="text-gray-600">
          Ask questions about Wikipedia articles and get AI-powered answers with citations
        </p>
      </div>

      {/* Query Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              Your Question
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What is artificial intelligence?"
              className="input min-h-[100px] resize-y"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Ask Question'}
          </button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card bg-red-50 border border-red-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-4">
          {/* Answer */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Answer</h2>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {result.answer}
            </p>

            {/* Metadata */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Pattern:</span> {result.metadata.pattern}
                </div>
                <div>
                  <span className="font-medium">Latency:</span> {result.metadata.latencyMs}ms
                </div>
                <div>
                  <span className="font-medium">Chunks Retrieved:</span> {result.metadata.retrievedChunks}
                </div>
              </div>
            </div>
          </div>

          {/* Sources */}
          {result.sources.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Sources</h2>
              <div className="space-y-3">
                {result.sources.map((source, idx) => (
                  <div
                    key={source.chunkId}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                          {idx + 1}
                        </span>
                        <h3 className="font-medium text-gray-900">{source.title}</h3>
                      </div>
                      <div className="text-sm text-gray-500">
                        {(source.similarity * 100).toFixed(1)}% match
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-3">
                      {source.chunkText}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
