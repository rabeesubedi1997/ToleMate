import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const reset = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.querySelectorAll<HTMLElement>('[data-scroll-top]').forEach(el => el.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }));
    };
    reset();
    requestAnimationFrame(reset);
  }, [pathname]);

  return null;
}
