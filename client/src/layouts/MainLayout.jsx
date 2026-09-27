import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import api from '../services/api.js';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    badge: null,
  },
  {
    to: '/syllabus',
    label: 'Syllabus',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    badge: 'Step 1',
  },
  {
    to: '/blueprint',
    label: 'Blueprint',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    badge: 'Step 2',
  },
  {
    to: '/questions',
    label: 'Questions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    badge: 'Step 3',
  },
  {
    to: '/rubric',
    label: 'Rubric',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    badge: 'Step 4',
  },
  {
    to: '/evaluate',
    label: 'Answer Evaluation',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    badge: 'NLP Core',
  },
];

function MainLayout() {
  const location = useLocation();
  const [systemStatus, setSystemStatus] = useState({ online: true, nlpReady: true });

  useEffect(() => {
    api.get('/health')
      .then((res) => {
        const data = res.data?.data;
        setSystemStatus({
          online: true,
          nlpReady: data?.services?.nlpService === 'reachable',
        });
      })
      .catch(() => {
        setSystemStatus({ online: false, nlpReady: false });
      });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-navy text-white flex flex-col shadow-xl z-20">
        {/* Brand header */}
        <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow to-aqua flex items-center justify-center shadow-lg shadow-black/20 text-navy font-display font-bold text-xl">
            E
          </div>
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight text-white flex items-center gap-2">
              Evalix
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-aqua/20 text-aqua border border-aqua/30">
                AI
              </span>
            </h1>
            <p className="text-xs text-white/60">Assessment &amp; Semantic NLP</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Assessment Workflow
          </div>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/15 text-white shadow-inner font-semibold border-l-4 border-yellow pl-3'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="transition-transform group-hover:scale-110 duration-200">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70 group-hover:text-white group-hover:bg-white/20">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* System Status & Footer */}
        <div className="p-4 border-t border-white/10 bg-navy-dark/40">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  systemStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              {systemStatus.online ? 'Node + DB Connected' : 'Offline'}
            </span>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                systemStatus.nlpReady
                  ? 'bg-mint text-green font-semibold'
                  : 'bg-yellow/20 text-yellow'
              }`}
            >
              {systemStatus.nlpReady ? 'NLP Ready' : 'NLP Loading'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-white/40 text-center">
            Evalix Assessment Platform
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-gray-200/80 px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-navy">Evalix</span>
            <span>/</span>
            <span className="capitalize text-green font-medium">
              {location.pathname.replace('/', '') || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-pink/60 px-3 py-1.5 rounded-lg border border-pink-dark/30 text-xs text-navy font-medium">
              <span className="w-2 h-2 rounded-full bg-green" />
              Academic Assessment Mode
            </div>
            <div className="w-8 h-8 rounded-full bg-navy text-white text-xs font-semibold flex items-center justify-center shadow">
              T
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-1 p-8 lg:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
