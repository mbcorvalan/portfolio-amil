'use client';

import React from 'react';
import styles from './BackToTop.module.scss';

export const BackToTop: React.FC = () => {
  const handleClick = () => {
    const start = window.scrollY;
    const duration = 1200;
    const startTime = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const elapsed = Math.min((now - startTime) / duration, 1);
      window.scrollTo(0, start * (1 - ease(elapsed)));
      if (elapsed < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  return (
    <button onClick={handleClick} className={styles.btn} aria-label="Back to top">
      Back to top
    </button>
  );
};
