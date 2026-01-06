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
          A collection of RAG demonstrations built with Cloudflare Workers AI, Vectorize, and D1.
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
              A simple Retrieval-Augmented Generation chatbot using Wikipedia data.
              Demonstrates vector search and context injection.
            </p>
          </Link>

          <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg opacity-50 cursor-not-allowed bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold text-gray-400 dark:text-gray-500 mb-2">
              Advanced RAG (Coming Soon)
            </h2>
            <p className="text-gray-400 dark:text-gray-500">
              Streaming responses, multi-turn conversations, and advanced retrieval patterns.
            </p>
          </div>
        </div>

        {/* Educational Resources */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
            Learn About RAG
          </h3>
          <div className="flex gap-3 justify-center">
            <Link
              to="/docs/faq"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              FAQ
            </Link>
            <Link
              to="/docs/glossary"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Glossary
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
