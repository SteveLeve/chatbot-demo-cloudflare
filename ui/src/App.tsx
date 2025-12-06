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
      </footer>
    </div>
  );
}

export default App;
