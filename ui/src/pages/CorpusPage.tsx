import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DemoLayout } from '../components/layouts/DemoLayout';
import corpusManifest from '../content/corpus-manifest.json';
import type { CorpusArticle, CorpusManifest } from '../types/corpus';
import type { ApiResponse } from '../types';
import type { TechStackInfo } from '../types/sidebar';
import { getApiUrl } from '../config';

const manifest = corpusManifest as CorpusManifest;

const TECH_STACK: TechStackInfo = {
  title: 'Built with',
  technologies: [
    'Cloudflare Workers AI',
    'Vectorize',
    'D1',
    'R2',
    'React Router v7',
  ],
  description:
    'Curated corpus — inspect exactly what this RAG demo can retrieve',
  githubUrl: 'https://github.com/SteveLeve/chatbot-demo-cloudflare',
};

function formatCharCount(count: number): string {
  if (count < 1000) return `${count} chars`;
  return `${(count / 1000).toFixed(1)}k chars`;
}

function CorpusList() {
  return (
    <div className="space-y-3">
      {manifest.articles.map((article) => (
        <Link
          key={article.id}
          to={`/docs/corpus/${article.id}`}
          className="block p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xs transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {article.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatCharCount(article.charCount)} · ~{article.chunkCount}{' '}
                chunks
              </p>
            </div>
            <span className="text-blue-600 dark:text-blue-400 text-sm shrink-0">
              Read →
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CorpusArticleView({ articleId }: { articleId: string }) {
  const manifestEntry = manifest.articles.find((a) => a.id === articleId);
  const [article, setArticle] = useState<CorpusArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(getApiUrl(`/api/v1/corpus/${articleId}`));
        const data: ApiResponse<CorpusArticle> = await response.json();

        if (!cancelled) {
          if (data.success && data.data) {
            setArticle(data.data);
          } else {
            setError(data.error?.message || 'Failed to load article');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load article',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  const askUrl = `/demos/basic-rag?q=${encodeURIComponent(
    `What is ${manifestEntry?.title || articleId}?`,
  )}`;

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/docs/corpus"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to corpus list
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {manifestEntry?.title || articleId}
        </h2>
        {manifestEntry && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatCharCount(manifestEntry.charCount)} · ~
            {manifestEntry.chunkCount} chunks
            {manifestEntry.sourceUrl && (
              <>
                {' · '}
                <a
                  href={manifestEntry.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Source ↗
                </a>
              </>
            )}
          </p>
        )}
      </div>

      {loading && (
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">
          Loading article…
        </p>
      )}

      {error && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-amber-900 dark:text-amber-200">
          <p className="font-medium mb-1">Article body not available yet</p>
          <p className="text-sm">{error}</p>
          <p className="text-sm mt-2 text-amber-800 dark:text-amber-300">
            The manifest above is static (bundled with this app). Full text is
            served from R2 after ingest:
            <code className="ml-1">npm run ingest:corpus</code>
          </p>
        </div>
      )}

      {article && (
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {article.content}
          </div>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Link
          to={askUrl}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors font-medium"
        >
          Ask about this topic
        </Link>
      </div>
    </div>
  );
}

export function CorpusPage() {
  const { id } = useParams<{ id?: string }>();

  return (
    <DemoLayout title="Corpus Browser" techStack={TECH_STACK}>
      <div className="max-w-4xl mx-auto p-6">
        <nav className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          <Link to="/" className="hover:text-gray-900 dark:hover:text-gray-100">
            Home
          </Link>{' '}
          /{' '}
          <Link
            to="/demos/basic-rag"
            className="hover:text-gray-900 dark:hover:text-gray-100"
          >
            Basic RAG Demo
          </Link>{' '}
          / <span className="text-gray-900 dark:text-gray-100">Corpus</span>
        </nav>

        {!id ? (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Demo Corpus
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                This list is <strong>static</strong> — bundled with the app so
                you can see exactly what knowledge the RAG system is designed to
                retrieve, with no API call.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {manifest.articleCount} curated articles · Simple English
                Wikipedia sources · thematic focus on computing, AI, and
                foundational science
              </p>
            </div>
            <CorpusList />
          </>
        ) : (
          <CorpusArticleView articleId={id} />
        )}
      </div>
    </DemoLayout>
  );
}
