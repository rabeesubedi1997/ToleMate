import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { User, Briefcase } from 'lucide-react';
import SeoHead from '../components/SeoHead';
import { API_BASE } from '../utils/config';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { getSetting } = useSettings();
  const siteName = getSetting('site_name', 'ToleMate');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'customer'
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.password_confirmation) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'vendor') navigate('/vendor-dashboard');
      else navigate('/dashboard');
      
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Create an Account"
        description="Join ToleMate as a customer or vendor. Start booking or offering services today."
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create an account</h1>
          <p className="text-gray-500 text-sm">Join {siteName} today</p>
        </div>

        <div className="card p-6 md:p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
              <input type="text" name="name" required className="input-field" placeholder="John Doe" value={formData.name} onChange={handleChange} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input type="email" name="email" required className="input-field" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">I want to</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'customer' })}
                  className={`flex items-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                    formData.role === 'customer' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Hire a pro
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'vendor' })}
                  className={`flex items-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                    formData.role === 'vendor' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Offer services
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" name="password" required className="input-field" placeholder="••••••••" value={formData.password} onChange={handleChange} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input type="password" name="password_confirmation" required className="input-field" placeholder="••••••••" value={formData.password_confirmation} onChange={handleChange} />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5 mt-2">
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400">or sign up with</span>
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
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default Register;
