'use client';

import React from 'react';
import { Link } from 'react-aria-components';
import { hero } from '@/lib/data';
import styles from '@/components/sections/Hero/Hero.module.scss';

interface HeaderProps {
  variant?: 'home' | 'page';
}

export const Header: React.FC<HeaderProps> = ({ variant = 'home' }) => {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft} />
      <span className={styles.topbarInfo}>
        <span className={styles.topbarNameFull}>{hero.name}</span>
        <span className={styles.topbarSeparator}>{' · '}</span>
        <span className={styles.topbarLocationFull}>{hero.location}</span>
        <span className={styles.topbarLocationShort}>{hero.locationShort}</span>
      </span>
      <nav className={styles.topbarRight} aria-label="Main navigation">
        {variant === 'home' ? (
          <>
            <Link href="#contact" className={styles.topbarLink}>Contact</Link>
            <Link href="#about" className={styles.topbarLink}>About Me</Link>
            <Link href="/blog" className={styles.topbarLink}>Blog</Link>
          </>
        ) : (
          <Link href="/" className={styles.topbarLink}>Home</Link>
        )}
      </nav>
    </header>
  );
};
