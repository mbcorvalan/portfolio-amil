'use client';

import React, { useEffect, useState } from 'react';
import styles from './BackToTop.module.scss';

const SHOW_AFTER_PX = 600;

export const BackToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);
  // How far the footer has scrolled into view; the button is lifted by this much so it never overlaps it
  const [footerOverlap, setFooterOverlap] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
      const footer = document.querySelector('footer');
      const footerTop = footer ? footer.getBoundingClientRect().top : Infinity;
      setFooterOverlap(Math.max(0, window.innerHeight - footerTop));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

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
    <button
      onClick={handleClick}
      className={`${styles.btn} ${visible ? styles.visible : ''}`}
      style={{ '--footer-overlap': `${footerOverlap}px` } as React.CSSProperties}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      Back to top
    </button>
  );
};
