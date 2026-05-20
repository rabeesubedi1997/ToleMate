import React from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';

const SOCIAL_LINKS = [
  { label: 'Facebook',  href: '#', icon: '📘' },
  { label: 'Instagram', href: '#', icon: '📸' },
  { label: 'Twitter',   href: '#', icon: '🐦' },
  { label: 'LinkedIn',  href: '#', icon: '💼' },
  { label: 'YouTube',   href: '#', icon: '▶️' },
];

const Footer: React.FC = () => {
  const { getSetting } = useSettings();
  const siteName = getSetting('site_name', 'ToleMate');
  const contactEmail = getSetting('contact_email', 'info@tolemate.com');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      {/* Main grid */}
      <div className="container-custom py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand column — spans 2 on large screens */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-primary-600 text-white rounded-xl flex items-center justify-center font-bold text-base shadow-lg">
                {siteName.charAt(0) || 'T'}
              </div>
              <span className="font-bold text-xl text-white">{siteName}</span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-500 mb-5 max-w-xs">
              Connecting you with trusted local professionals for every home and business need. Your satisfaction is our priority.
            </p>

            {/* Social icons */}
            <div className="flex gap-2">
              {SOCIAL_LINKS.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 bg-gray-800 hover:bg-primary-600 rounded-lg flex items-center justify-center text-base transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>

            <p className="text-xs text-gray-600 mt-5">{contactEmail}</p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Services</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Home Repair',    to: '/services?search=Home+Repair' },
                { label: 'Plumbing',       to: '/services?search=Plumbing' },
                { label: 'Electrical',     to: '/services?search=Electrical' },
                { label: 'Cleaning',       to: '/services?search=Cleaning' },
                { label: 'Tech Support',   to: '/services?search=Tech+Support' },
                { label: 'All Services',   to: '/services' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.to} className="hover:text-white transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'About Us',          to: '/about' },
                { label: 'Contact',           to: '/contact' },
                { label: 'Blog',              to: '/blog' },
                { label: 'Terms & Conditions',to: '/terms' },
                { label: 'Privacy Policy',    to: '/privacy' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.to} className="hover:text-white transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Professionals */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">For Professionals</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Become a Provider', to: '/register?role=vendor' },
                { label: 'Provider Login',    to: '/login' },
                { label: 'Marketplace',       to: '/marketplace' },
                { label: 'Post a Job',        to: '/post-request' },
              ].map(item => (
                <li key={item.label}>
                  <Link to={item.to} className="hover:text-white transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>

            {/* App download mini */}
            <div className="mt-6 space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">Download App</p>
              {[{ store: 'App Store', icon: '🍎' }, { store: 'Google Play', icon: '▶' }].map(a => (
                <a key={a.store} href="#"
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-xs text-gray-300 hover:text-white transition-colors">
                  <span>{a.icon}</span> {a.store}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="container-custom py-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-600">
          <p>© {currentYear} {siteName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span>All systems operational</span>
            </div>
            <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
