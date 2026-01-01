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
      </div>
    </div>
  );
}
