import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { BasicChatPage } from './pages/BasicChatPage';
import { FaqPage } from './pages/FaqPage';
import { GlossaryPage } from './pages/GlossaryPage';
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
          <Route path="/docs/faq" element={<FaqPage />} />
          <Route path="/docs/glossary" element={<GlossaryPage />} />
        </Routes>
        {/* Footer removed - now per-page */}
      </div>
    </BrowserRouter>
  );
}

export default App;
