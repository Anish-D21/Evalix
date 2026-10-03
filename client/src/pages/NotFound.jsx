import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo.jsx';

function NotFound() {
  return (
    <div className="text-center py-20 flex flex-col items-center justify-center">
      <BrandLogo variant="mark" size="lg" className="mb-6" />
      <h2 className="text-2xl font-bold font-display text-brand-carbon dark:text-brand-silk mb-2">
        Page Not Found
      </h2>
      <p className="text-sm text-brand-granite dark:text-brand-lilac/70 mb-6 max-w-sm">
        The requested resource or page does not exist within the Evalix Assessment platform.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-charcoal hover:bg-brand-carbon text-white text-xs font-semibold shadow-md transition-all border border-brand-charcoal/60 hover:border-brand-ice/60"
      >
        <span>Back to Dashboard</span>
        <span>→</span>
      </Link>
    </div>
  );
}

export default NotFound;
