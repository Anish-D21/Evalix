import { useEffect, useState } from 'react';
import api from './services/api.js';

// Phase 0 placeholder. This will be replaced by the routed application
// (teacher dashboard, student exam UI, etc.) in later phases. For now it
// exists to prove the frontend -> backend wiring works end to end.
function App() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    api
      .get('/health')
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'));
  }, []);

  const badgeColor =
    status === 'online' ? 'bg-mint text-green' : status === 'offline' ? 'bg-pink text-navy' : 'bg-aqua text-navy';

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full mx-4 p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-semibold text-navy mb-1">Evalix</h1>
        <p className="text-sm text-gray-500 mb-6">
          AI-Powered Question Paper Generation &amp; Explainable Semantic Answer Evaluation
        </p>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${badgeColor}`}>
          <span className="w-2 h-2 rounded-full bg-current" />
          Backend API: {status}
        </div>
        <p className="mt-6 text-xs text-gray-400">
          Phase 0 scaffold — routing, dashboards, and exam UI arrive in later phases.
        </p>
      </div>
    </div>
  );
}

export default App;
