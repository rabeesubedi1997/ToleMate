import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import SeoHead from '../components/SeoHead';
import { API_BASE } from '../utils/config';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Forgot Password"
        description="Reset your ToleMate account password. Enter your email to receive a reset link."
        noIndex={true}
      />
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 bg-primary-600 text-white rounded-2xl items-center justify-center text-2xl font-bold shadow-lg mb-4">T</div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your email and we'll send you a reset link.</p>
        </div>

        <div className="card p-6 sm:p-8">
          {sent ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500 mb-2">
                We sent a password reset link to <strong className="text-gray-800">{email}</strong>
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Didn't receive it? Check your spam folder or try again.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="btn-secondary text-sm w-full"
              >
                Try a different email
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    className="input-field pl-10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending link...
                  </span>
                ) : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-5">
          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
        </div>
      </div>
    </div>
    </>
  );
};

export default ForgotPassword;
