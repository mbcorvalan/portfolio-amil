'use client';

import React from 'react';
import { Link } from 'react-aria-components';
import styles from './Hero.module.scss';

export const Hero: React.FC = () => {
  return (
    <section id="hero" className={styles.hero} aria-labelledby="hero-title">
      <header className={styles.topbar}>
        <div className={styles.topbarLeft} />
        <span className={styles.topbarInfo}>Maria Belen Corvalan Amil · Buenos Aires, Argentina</span>
        <nav className={styles.topbarRight} aria-label="Main navigation">
          <Link href="#contact" className={styles.topbarLink}>Contact</Link>
          <Link href="#about" className={styles.topbarLink}>About Me</Link>
          <a href="/files/maria_belen_corvalan_amil.pdf" download="maria_belen_corvalan_amil.pdf" className={styles.topbarLink}>Download CV</a>
        </nav>
      </header>

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