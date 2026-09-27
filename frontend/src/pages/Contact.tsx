import React, { useRef, useState } from 'react';
import { Mail, Send, CheckCircle2 } from 'lucide-react';
import SeoHead from '../components/SeoHead';
import Captcha, { CaptchaHandle } from '../components/Captcha';
import { useSettings } from '../context/SettingsContext';
import api from '../utils/api';

const Contact: React.FC = () => {
  const { getSetting } = useSettings();
  const contactEmail = getSetting('contact_email', 'info@tolemate.com');
  const captchaRequired = getSetting('captcha_enabled', '0') === '1' && !!getSetting('recaptcha_site_key', '');

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (captchaRequired && !captchaToken) {
      setError('Please complete the captcha challenge.');
      return;
    }

    setSending(true);
    try {
      await api.post('/contact', { ...form, captcha_token: captchaToken });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not send your message. Please try again.');
      captchaRef.current?.reset();
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Contact Us"
        description="Get in touch with the ToleMate team - questions, feedback, or support."
        canonicalUrl={window.location.href}
      />
      <div className="min-h-[70vh] py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Contact us</h1>
            <p className="text-gray-500 text-sm">
              Questions or feedback? Send us a message or email us at{' '}
              <a href={`mailto:${contactEmail}`} className="text-primary-600 hover:underline">{contactEmail}</a>.
            </p>
          </div>

          <div className="card p-6 md:p-8">
            {sent ? (
              <div className="text-center py-4">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Message sent</h2>
                <p className="text-sm text-gray-500">We'll get back to you as soon as we can.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
                  <input type="text" name="name" required className="input-field" value={form.name} onChange={handleChange} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" name="email" required className="input-field pl-10" placeholder="you@example.com" value={form.email} onChange={handleChange} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                  <input type="text" name="subject" className="input-field" value={form.subject} onChange={handleChange} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                  <textarea name="message" required rows={5} className="input-field resize-none" value={form.message} onChange={handleChange} />
                </div>

                <Captcha ref={captchaRef} onChange={setCaptchaToken} />

                <button type="submit" disabled={sending} className="btn-primary w-full py-2.5">
                  {sending ? 'Sending...' : <><Send className="w-4 h-4" /> Send message</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;
