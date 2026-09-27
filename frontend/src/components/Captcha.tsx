import React, { useEffect, useId, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: string | HTMLElement, params: Record<string, unknown>) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    onRecaptchaApiLoad?: () => void;
  }
}

const SCRIPT_ID = 'recaptcha-api-script';
let scriptLoadingPromise: Promise<void> | null = null;

const loadRecaptchaScript = (): Promise<void> => {
  if (window.grecaptcha) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve) => {
    window.onRecaptchaApiLoad = () => resolve();
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaApiLoad&render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
};

interface CaptchaProps {
  onChange: (token: string | null) => void;
}

export interface CaptchaHandle {
  reset: () => void;
}

/**
 * Renders the Google reCAPTCHA v2 checkbox widget when the super admin has
 * turned captcha on in Settings. Renders nothing otherwise, so forms work
 * unchanged when captcha is disabled or unconfigured.
 */
const Captcha = React.forwardRef<CaptchaHandle, CaptchaProps>(({ onChange }, ref) => {
  const { getSetting, loading } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const domId = useId().replace(/:/g, '-');

  const enabled = getSetting('captcha_enabled', '0') === '1';
  const siteKey = getSetting('recaptcha_site_key', '');

  React.useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetIdRef.current);
        onChange(null);
      }
    },
  }));

  useEffect(() => {
    if (loading || !enabled || !siteKey || !containerRef.current) return;

    let cancelled = false;
    loadRecaptchaScript().then(() => {
      if (cancelled || !containerRef.current || !window.grecaptcha) return;
      if (widgetIdRef.current !== null) return;
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onChange(token),
        'expired-callback': () => onChange(null),
      });
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, enabled, siteKey]);

  if (loading || !enabled || !siteKey) return null;

  return <div id={`captcha-${domId}`} ref={containerRef} className="my-2" />;
});

Captcha.displayName = 'Captcha';

export default Captcha;
