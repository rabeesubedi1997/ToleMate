import React from 'react';
import SeoHead from '../components/SeoHead';
import { useSettings } from '../context/SettingsContext';

const About: React.FC = () => {
  const { getSetting } = useSettings();
  const siteName = getSetting('site_name', 'ToleMate');

  return (
    <>
      <SeoHead
        title="About Us"
        description={`Learn about ${siteName}, the local service marketplace connecting customers with trusted professionals.`}
        canonicalUrl={window.location.href}
      />
      <div className="max-w-3xl mx-auto px-4 py-14">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About {siteName}</h1>
        <div className="prose prose-gray max-w-none space-y-4 text-gray-600 leading-relaxed">
          <p>
            {siteName} connects customers with verified local professionals for home repairs,
            cleaning, electrical work, plumbing, and more. Our mission is to make it simple and
            safe to find, book, and pay trusted service providers in your area.
          </p>
          <p>
            Whether you need a one-off repair or an ongoing service relationship, {siteName}
            helps you compare providers, read verified reviews, and book with confidence -
            all in one place.
          </p>
          <p>
            For service providers, {siteName} offers a straightforward way to reach new
            customers, manage bookings, and grow your business.
          </p>
        </div>
      </div>
    </>
  );
};

export default About;
