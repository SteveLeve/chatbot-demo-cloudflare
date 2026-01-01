import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { BasicChatPage } from './pages/BasicChatPage';
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
        </Routes>
        {/* Footer removed - now per-page */}
      </div>
    </BrowserRouter>
  );
}

export default App;
