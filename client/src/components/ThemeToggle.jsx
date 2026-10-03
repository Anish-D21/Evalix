import { useTheme } from '../context/ThemeContext.jsx';

function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme, isDark } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className="p-2 rounded-xl transition-all duration-300 relative group overflow-hidden border border-brand-charcoal/40 bg-brand-charcoal/20 hover:bg-brand-charcoal/40 text-brand-silk dark:text-brand-silk hover:border-brand-lilac/50 hover:shadow-lg hover:shadow-brand-carbon/30"
      >
        <span className="sr-only">Toggle theme</span>
        {isDark ? (
          // Moon icon with gentle stars
          <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12 text-brand-silk" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          // Sun icon with rays
          <svg className="w-4 h-4 transition-transform duration-500 group-hover:rotate-90 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-300 group
        border-brand-charcoal/30 bg-brand-charcoal/20 hover:bg-brand-charcoal/35 dark:border-brand-charcoal/50 dark:bg-brand-carbon/60 text-xs font-medium text-brand-silk/90 hover:text-white"
    >
      <div className="relative w-7 h-4 rounded-full bg-brand-charcoal/60 dark:bg-brand-charcoal/80 p-0.5 transition-colors">
        <div
          className={`w-3 h-3 rounded-full transition-transform duration-300 transform flex items-center justify-center shadow-sm ${
            isDark
              ? 'translate-x-3 bg-brand-ice text-brand-carbon'
              : 'translate-x-0 bg-brand-silk text-brand-charcoal'
          }`}
        >
          {isDark ? (
            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : (
            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
      <span className="hidden sm:inline font-display text-[11px] tracking-wide uppercase text-brand-silk/80 group-hover:text-brand-silk">
        {isDark ? 'Dark Mode' : 'Light Mode'}
      </span>
    </button>
  );
}

export default ThemeToggle;
