'use client';

import React from 'react';
import { summary } from '@/lib/data';
import styles from '../Hero/Hero.module.scss';
import summaryStyles from './Summary.module.scss';


export const Summary: React.FC = () => {
  return (
    <section id="summary" className={styles.summarySection} aria-labelledby="summary-title">
      <div className={styles.summaryContainer}>
        <h1 id="summary-title" className={styles.headline}>{summary.headline}</h1>
        <p className={styles.role}>{summary.role}</p>
        <p className={styles.subtitle}>{summary.subtitle}</p>
        <p className={`${styles.description} ${styles.descriptionDesktop}`}>{summary.description}</p>
        <p className={`${styles.description} ${styles.descriptionMobile}`}>{summary.descriptionMobile}</p>
        <nav className={summaryStyles.ctaRow} aria-label="Primary actions">
          <a href="#experience" className={`${summaryStyles.ctaButton} ${summaryStyles.ctaPrimary}`}>
            View experience
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="/files/maria_belen_corvalan_amil.pdf" download className={`${summaryStyles.ctaButton} ${summaryStyles.ctaSecondary}`} aria-label="Download resume (PDF)">
            Download resume
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2v7m-3-3l3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="#contact" className={`${summaryStyles.ctaButton} ${summaryStyles.ctaGhost}`}>
            Contact me
          </a>
          <a href="/blog" className={summaryStyles.ctaLink}>
            Blog
          </a>
        </nav>
      </div>
    </section>
  );
};
