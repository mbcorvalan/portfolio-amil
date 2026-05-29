'use client';

import React from 'react';
import styles from './BackToTop.module.scss';

export const BackToTop: React.FC = () => {
  const handleClick = () => {
    // Primary: try window
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      try {
        window.scrollTo(0, 0);
      } catch (_) {}
    }

    // Try document.scrollingElement / root
    const root = document.scrollingElement || document.documentElement || document.body;
    try {
      // @ts-ignore
      root.scrollTo && root.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      try {
        // @ts-ignore
        root.scrollTop = 0;
      } catch (_) {}
    }

    // Fallback: scroll any scrollable containers on the page
    try {
      const els = Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) => {
        const cs = getComputedStyle(el);
        return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
      });

      els.forEach((el) => {
        try {
          el.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
          el.scrollTop = 0;
        }
      });
    } catch (e) {}
  };

  return (
    <button onClick={handleClick} className={styles.btn} aria-label="Back to top">
      Back to top
    </button>
  );
};
