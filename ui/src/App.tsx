import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { BasicChatPage } from './pages/BasicChatPage';
import { AgentChatPage } from './pages/AgentChatPage';
import { FaqPage } from './pages/FaqPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { CorpusPage } from './pages/CorpusPage';
import { EvalPage } from './pages/EvalPage';
import { RedteamPage } from './pages/RedteamPage';
import { applyTheme, getInitialTheme } from './lib/theme';

function App() {
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/demos/basic-rag" element={<BasicChatPage />} />
          <Route path="/demos/agent-rag" element={<AgentChatPage />} />
          <Route path="/docs/faq" element={<FaqPage />} />
          <Route path="/docs/glossary" element={<GlossaryPage />} />
          <Route path="/docs/corpus" element={<CorpusPage />} />
          <Route path="/docs/corpus/:id" element={<CorpusPage />} />
          <Route path="/docs/eval" element={<EvalPage />} />
          <Route path="/docs/redteam" element={<RedteamPage />} />
        </Routes>
        {/* Footer removed - now per-page */}
      </div>
    </BrowserRouter>
  );
}

export default App;
