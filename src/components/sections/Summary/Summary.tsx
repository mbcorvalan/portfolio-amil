'use client';

import React from 'react';
import styles from '../Hero/Hero.module.scss';
import summaryStyles from './Summary.module.scss';


export const Summary: React.FC = () => {
  return (
    <section id="summary" className={styles.summarySection}>
      <div className={styles.summaryContainer}>
        <aside className={styles.meta} aria-label="Professional summary">
          <p className={styles.metaDescription}>
            <strong>Senior Frontend Developer</strong> with more than
            6+ years building scalable, user-centered apps.
            Focused on architecture, accessibility & performance.
            Working with AI to improve and accelerate development workflows.
          </p>
        </aside>
      </div>
      <div className={summaryStyles.discoverWrapper}>
        <a href="#experience" className={summaryStyles.discoverBtn} aria-label="Go to experience" onClick={e => {
          e.preventDefault();
          const target = document.getElementById('experience');
          if (!target) return;
          const start = window.scrollY;
          const end = target.getBoundingClientRect().top + start;
          const duration = 1400;
          const startTime = performance.now();
          const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          const step = (now: number) => {
            const elapsed = Math.min((now - startTime) / duration, 1);
            window.scrollTo(0, start + (end - start) * ease(elapsed));
            if (elapsed < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 7l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </section>
  );
};
