'use client';

import React from 'react';
import { summary } from '@/lib/data';
import { uiStrings } from '@/lib/i18n/translations';
import styles from '../Hero/Hero.module.scss';
import summaryStyles from './Summary.module.scss';


export const Summary: React.FC = () => {
  const t = uiStrings;
  const s = summary;
  const nameWords = s.headline.split(' ');
  const givenNames = nameWords.slice(0, 2).join(' ');
  const surname = nameWords.slice(2).join(' ');

  return (
    <section id="summary" className={styles.summarySection} aria-labelledby="summary-title">
      <div className={styles.summaryContainer}>
        <h1 id="summary-title" className={styles.headline}>
          {givenNames}{surname && <> <span className={styles.headlineAccent}>{surname}</span></>}
        </h1>
        <p className={styles.role}>{s.role}</p>
        <p className={`${styles.description} ${styles.descriptionDesktop}`}>{s.description}</p>
        <p className={`${styles.description} ${styles.descriptionMobile}`}>{s.descriptionMobile}</p>
        <nav className={summaryStyles.ctaRow} aria-label="Primary actions">
          <a href="#experience" className={`${summaryStyles.ctaButton} ${summaryStyles.ctaPrimary}`}>
            {t.ctaViewExperience}
          </a>
          <a href="/files/maria_belen_corvalan_amil.pdf" download className={`${summaryStyles.ctaButton} ${summaryStyles.ctaSecondary}`} aria-label="Download resume (PDF)">
            {t.ctaDownloadResume}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2v7m-3-3l3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </nav>
      </div>
    </section>
  );
};
