'use client';

import React from 'react';
import { Header } from '@/components/ui/Header/Header';
import styles from './Hero.module.scss';

export const Hero: React.FC = () => {
  return (
    <section id="hero" className={styles.hero} aria-labelledby="hero-title">
      <Header variant="home" />

      <h1 className={styles.wordmark} id="hero-title" aria-label="AMIL">
        <span className={styles.letterMask}>
          <span className={`${styles.letter} ${styles.letterA}`} aria-hidden="true">A</span>
        </span>
        <span className={styles.letterMask}>
          <span className={`${styles.letter} ${styles.letterM}`} aria-hidden="true">M</span>
        </span>
        <span className={styles.letterMask}>
          <span className={`${styles.letter} ${styles.letterI}`} aria-hidden="true">I</span>
        </span>
        <span className={styles.letterMask}>
          <span className={`${styles.letter} ${styles.letterL}`} aria-hidden="true">L</span>
        </span>
      </h1>


    </section>
  );
};