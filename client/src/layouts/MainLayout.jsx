import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import api from '../services/api.js';
import BrandLogo from '../components/BrandLogo.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

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
    badgeType: 'step1',
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
    badgeType: 'step2',
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
    badgeType: 'step3',
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
    badgeType: 'step4',
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
    badgeType: 'nlp',
  },
];

function NavBadge({ label, type }) {
  if (!label) return null;

  if (type === 'nlp') {
    return (
      <span className="relative inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-gradient-to-r from-brand-charcoal via-brand-carbon to-brand-charcoal border border-brand-ice/60 text-brand-ice shadow-glow-ice badge-shimmer-effect group-hover:scale-105 transition-all duration-300">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-ice opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-ice" />
        </span>
        {label}
      </span>
    );
  }

  // Step Badges with beautiful themed gradients & animated shine
  const badgeStyles = {
    step1: 'bg-gradient-to-r from-brand-lilac/30 to-brand-silk/30 border-brand-lilac/40 text-brand-silk group-hover:border-brand-silk/70 group-hover:shadow-glow-silk',
    step2: 'bg-gradient-to-r from-brand-charcoal/80 to-brand-granite/40 border-brand-granite/50 text-brand-silk group-hover:border-brand-lilac/60',
    step3: 'bg-gradient-to-r from-brand-silk/25 to-brand-lilac/25 border-brand-silk/40 text-brand-silk group-hover:border-brand-silk/80',
    step4: 'bg-gradient-to-r from-brand-lilac/35 to-brand-charcoal/60 border-brand-lilac/50 text-brand-silk group-hover:border-brand-lilac/80 group-hover:shadow-glow-lilac',
  };

  const styleClass = badgeStyles[type] || 'bg-brand-charcoal/50 border-brand-charcoal text-brand-silk';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border shadow-sm transition-all duration-300 group-hover:scale-105 ${styleClass} badge-shimmer-effect`}
    >
      {label}
    </span>
  );
}

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

  const currentRouteName = location.pathname.replace('/', '') || 'Dashboard';

  return (
    <div className="min-h-screen flex bg-[#F9F7F6] dark:bg-[#0f1616] font-sans transition-colors duration-300 selection:bg-brand-lilac selection:text-brand-carbon">
      {/* Sidebar */}
      <aside className="w-68 shrink-0 bg-gradient-to-b from-[#141D1D] via-[#172121] to-[#0D1414] text-white flex flex-col shadow-2xl border-r border-brand-charcoal/30 z-20 transition-all duration-300">
        {/* Brand header using official user logo */}
        <div className="px-5 py-6 border-b border-brand-charcoal/30 bg-[#121919]/60 backdrop-blur-sm">
          <BrandLogo variant="header" size="md" withLink={true} />
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-brand-granite/80 flex items-center justify-between">
            <span>Assessment Pipeline</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-ice/60 animate-pulse" />
          </div>

          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-charcoal/90 via-brand-charcoal/60 to-brand-carbon/40 text-white font-semibold shadow-lg shadow-black/30 border-l-4 border-brand-lilac pl-3'
                    : 'text-brand-silk/75 hover:bg-brand-charcoal/30 hover:text-white hover:translate-x-1'
                }`
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="transition-transform duration-200 group-hover:scale-110 text-brand-lilac group-hover:text-brand-ice shrink-0">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              <NavBadge label={item.badge} type={item.badgeType} />
            </NavLink>
          ))}
        </nav>

        {/* System Status & Footer */}
        <div className="p-4 border-t border-brand-charcoal/40 bg-[#0E1515]/90 backdrop-blur-sm">
          {/* Glass Status Card */}
          <div className="p-3 rounded-xl bg-brand-carbon/80 border border-brand-charcoal/50 shadow-inner">
            <div className="flex items-center justify-between text-xs text-brand-silk/80 mb-2">
              <span className="flex items-center gap-2 font-medium">
                <span className="relative flex h-2 w-2">
                  {systemStatus.online && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      systemStatus.online ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                  />
                </span>
                {systemStatus.online ? 'Node + DB Connected' : 'Offline'}
              </span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  systemStatus.nlpReady
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {systemStatus.nlpReady ? 'NLP Ready' : 'NLP Loading'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-brand-granite pt-1.5 border-t border-brand-charcoal/30">
              <span className="font-mono">MiniLM-L6-v2</span>
              <span className="text-brand-ice/80 font-mono">v2.4.0</span>
            </div>
          </div>

          <div className="mt-2.5 text-[10px] text-brand-granite/70 text-center tracking-wider uppercase font-medium">
            Evalix AI Assessment Engine
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 bg-white/90 dark:bg-[#141D1D]/90 backdrop-blur-md border-b border-brand-silk/60 dark:border-brand-charcoal/40 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm transition-colors duration-300">
          {/* Breadcrumb with Logo Emblem */}
          <div className="flex items-center gap-2.5 text-xs text-brand-granite dark:text-brand-lilac/80">
            <BrandLogo variant="mark" size="sm" withLink={true} />
            <span className="font-bold text-brand-carbon dark:text-brand-silk uppercase tracking-wide">Evalix</span>
            <span className="text-brand-granite/50">/</span>
            <span className="capitalize font-semibold text-brand-charcoal dark:text-brand-ice">
              {currentRouteName}
            </span>
          </div>

          {/* Right Header Utilities: Academic Mode Badge + Dark/Light Theme Toggle + Avatar */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-brand-charcoal/30 dark:border-brand-charcoal/60 bg-brand-silk/20 dark:bg-brand-carbon/60 text-xs text-brand-carbon dark:text-brand-silk font-medium shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Academic Assessment Mode</span>
            </div>

            {/* Dark Mode / Light Mode Interactive Toggle */}
            <ThemeToggle />

            {/* Profile Avatar */}
            <div
              title="Academic Evaluator"
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-charcoal to-brand-carbon text-brand-silk text-xs font-bold flex items-center justify-center shadow-md border border-brand-charcoal/60 hover:border-brand-ice/60 transition-colors cursor-pointer"
            >
              EX
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
