import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-transparent dark:border-gray-700">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">
          Cloudflare RAG Portfolio
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
          A Cloudflare-first demo of retrieval-augmented generation and agentic architecture on
          Workers AI, Vectorize, D1, and R2.
        </p>

        <div className="grid gap-4">
          <Link
            to="/demos/basic-rag"
            className="block p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all group bg-white dark:bg-gray-800"
          >
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2">
              Basic RAG Chatbot
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Single-turn retrieval over a curated corpus. See vector search, context injection,
              and cited answers.
            </p>
          </Link>

          <Link
            to="/docs/corpus"
            className="block p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all group bg-white dark:bg-gray-800"
          >
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2">
              Corpus Browser
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Inspect the ~37 committed articles this demo can retrieve — static manifest, no API
              round-trip to see what the system knows.
            </p>
          </Link>

          <div className="p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Agentic RAG + Trace UI
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Cloudflare Agents SDK runtime with transparent step traces, eval reporting, and
              red-team scenarios — tracked in epic #30 (Phases 3–5).
            </p>
          </div>
        </div>

        {/* Educational Resources */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
            Learn About RAG
          </h3>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/docs/faq"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              FAQ
            </Link>
            <Link
              to="/docs/glossary"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Glossary
            </Link>
            <Link
              to="/docs/corpus"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Corpus
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
