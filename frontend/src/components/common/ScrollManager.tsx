import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollManager guarantees:
 * 1. Smooth scroll to form upwards or downwards when navigating to any page where a form is present.
 * 2. Smooth scroll to top when navigating to pages without a form.
 * 3. Smooth scroll to anchor targets when a hash is present (e.g. #how-it-works).
 * 4. Responsive scroll on button/link clicks triggering forms or steps.
 */
export const ScrollManager: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // 1. Hash-based in-page anchor
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    // 2. Chat route manages its own message history scroll
    if (location.pathname.startsWith('/chat')) {
      return;
    }

    // 3. Small timeout to allow destination DOM to mount
    const timer = setTimeout(() => {
      const formEl = document.querySelector('form:not([data-no-scroll])');
      if (formEl) {
        // Scroll smoothly upwards or downwards to the form
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Scroll smoothly to top
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    }, 90);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search, location.hash]);

  // Global listener for interactive buttons/links that reveal or navigate to forms/steps
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const triggerBtn = target.closest('button, a');
      if (!triggerBtn) return;

      const btnText = (triggerBtn.textContent || '').trim().toLowerCase();
      const href = triggerBtn.getAttribute('href') || '';

      // Check if button is a CTA, navigation, or form step changer
      const isFormTrigger =
        btnText.includes('next') ||
        btnText.includes('back') ||
        btnText.includes('partner') ||
        btnText.includes('register') ||
        btnText.includes('create profile') ||
        btnText.includes('sign in') ||
        btnText.includes('join') ||
        btnText.includes('edit profile') ||
        href.includes('register') ||
        href.includes('login') ||
        href.includes('profile');

      if (isFormTrigger) {
        setTimeout(() => {
          if (window.location.pathname.startsWith('/chat')) return;
          const formEl = document.querySelector('form:not([data-no-scroll])');
          if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 120);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  return null;
};
export default ScrollManager;
