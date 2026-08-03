import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll<HTMLElement>('[data-scroll-top]').forEach(el => el.scrollTo(0, 0));
  }, [pathname]);

  return null;
}
