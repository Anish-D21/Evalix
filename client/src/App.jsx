import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import MainLayout from './layouts/MainLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Syllabus from './pages/Syllabus.jsx';
import Blueprint from './pages/Blueprint.jsx';
import Questions from './pages/Questions.jsx';
import Rubric from './pages/Rubric.jsx';
import Evaluation from './pages/Evaluation.jsx';
import NotFound from './pages/NotFound.jsx';

// Phase 8 Step 1: routing foundation. Every route renders inside
// MainLayout's shared sidebar/content shell. No data fetching or API
// wiring happens here yet — each page is a placeholder ready for the
// next implementation step to fill in.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="syllabus" element={<Syllabus />} />
          <Route path="blueprint" element={<Blueprint />} />
          <Route path="questions" element={<Questions />} />
          <Route path="rubric" element={<Rubric />} />
          <Route path="evaluate" element={<Evaluation />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
