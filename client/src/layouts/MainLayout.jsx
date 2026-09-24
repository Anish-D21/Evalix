import { NavLink, Outlet } from 'react-router-dom';

// Single shared shell for every Evalix page: a left sidebar for
// section navigation plus a content area rendered via <Outlet/>. Kept
// intentionally simple — no state, no data fetching — so it's safe to
// reuse across every future page without coupling them together.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/syllabus', label: 'Syllabus' },
  { to: '/blueprint', label: 'Blueprint' },
  { to: '/questions', label: 'Questions' },
  { to: '/rubric', label: 'Rubric' },
  { to: '/evaluate', label: 'Answer Evaluation' },
];

function MainLayout() {
  return (
    <div className="min-h-screen flex bg-white">
      <aside className="w-64 shrink-0 bg-navy text-white flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <h1 className="text-xl font-semibold">Evalix</h1>
          <p className="text-xs text-white/60 mt-1">AI-Powered Assessment Platform</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 text-xs text-white/40 border-t border-white/10">Phase 8 — Frontend Foundation</div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
