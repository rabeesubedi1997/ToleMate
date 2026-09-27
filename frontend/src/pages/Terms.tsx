import React from 'react';
import SeoHead from '../components/SeoHead';
import { useSettings } from '../context/SettingsContext';

const Terms: React.FC = () => {
  const { getSetting } = useSettings();
  const siteName = getSetting('site_name', 'ToleMate');

  return (
    <>
      <SeoHead title="Terms & Conditions" description={`Terms and conditions for using ${siteName}.`} canonicalUrl={window.location.href} />
      <div className="max-w-3xl mx-auto px-4 py-14">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms & Conditions</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
        <div className="prose prose-gray max-w-none space-y-6 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of terms</h2>
            <p>By accessing or using {siteName}, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the platform.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. The platform</h2>
            <p>{siteName} is a marketplace connecting customers with independent service providers ("vendors"). {siteName} does not itself provide the services listed and is not a party to any agreement between a customer and a vendor.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate information when registering.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Bookings & payments</h2>
            <p>Prices, availability, and service quality are set and managed by individual vendors. Payments made through the platform are processed via supported payment methods; refunds and disputes are handled per the platform's dispute resolution process.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Conduct</h2>
            <p>Users must not use the platform for unlawful purposes, harassment, fraud, or to circumvent the platform's fee structure. Accounts found in violation may be suspended or terminated.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Limitation of liability</h2>
            <p>{siteName} is provided "as is" without warranties of any kind. To the fullest extent permitted by law, {siteName} is not liable for damages arising from the use of the platform or from the acts or omissions of vendors.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Changes to these terms</h2>
            <p>We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Contact</h2>
            <p>Questions about these terms can be sent via our <a href="/contact" className="text-primary-600 hover:underline">contact form</a>.</p>
          </section>
        </div>
      </div>
    </>
  );
};

export default Terms;
