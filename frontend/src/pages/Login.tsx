import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock } from 'lucide-react';
import SeoHead from '../components/SeoHead';
import { API_BASE } from '../utils/config';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { getSetting } = useSettings();
  const { login } = useAuth();

  const siteName = getSetting('site_name', 'ToleMate');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      login(data.access_token, data.user);

      // Redirect to the page they came from, or role-based default
      const from = (location.state as any)?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (data.user.role === 'super_admin') {
        navigate('/super-admin');
      } else if (data.user.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (data.user.role === 'vendor') {
        navigate('/vendor-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Login"
        description="Sign in to your ToleMate account to book services or manage your listings."
        canonicalUrl={window.location.href}
      />
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
              {siteName.charAt(0) || 'T'}
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm">Sign in to your {siteName} account</p>
        </div>

        <div className="card p-6 md:p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <a href="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700">Forgot password?</a>
              </div>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-2.5"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400">or continue with</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary text-sm py-2.5">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="Google" />
              Google
            </button>
            <button className="btn-secondary text-sm py-2.5">
              <img src="https://www.svgrepo.com/show/303108/apple-black-logo.svg" className="w-4 h-4" alt="Apple" />
              Apple
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
    </>
  );
};


export default Login;
