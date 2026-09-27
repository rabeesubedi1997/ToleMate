import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import SeoHead from '../components/SeoHead';

const NotFound: React.FC = () => {
  return (
    <>
      <SeoHead title="Page Not Found" description="The page you're looking for doesn't exist." noIndex={true} />
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-md">
          <p className="text-7xl font-bold text-primary-600 mb-2">404</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
          <p className="text-gray-500 mb-8">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/" className="btn-primary">
              <Home className="w-4 h-4" /> Back home
            </Link>
            <Link to="/services" className="btn-secondary">
              <Search className="w-4 h-4" /> Browse services
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
