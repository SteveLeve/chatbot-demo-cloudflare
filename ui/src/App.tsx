import { QueryInterface } from './components/QueryInterface';

function App() {
  return (
    <div className="min-h-screen py-12 px-4">
      <QueryInterface />

      {/* Footer */}
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>
          Built with Cloudflare Workers AI, Vectorize, D1, and R2
        </p>
        <p className="mt-1">
          Demonstrating RAG patterns on the edge
        </p>
        <p className="mt-3">
          <a 
            href="https://github.com/SteveLeve/chatbot-demo-cloudflare" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="GitHub Repository"
          >
            <img 
              src="/assets/github-mark/github-mark.svg" 
              alt="GitHub" 
              className="w-5 h-5"
            />
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
