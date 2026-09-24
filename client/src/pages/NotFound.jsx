import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="text-center py-16">
      <h2 className="text-2xl font-semibold text-navy mb-2">Page not found</h2>
      <p className="text-sm text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="text-sm font-medium text-green hover:underline">
        Back to Dashboard
      </Link>
    </div>
  );
}

export default NotFound;
