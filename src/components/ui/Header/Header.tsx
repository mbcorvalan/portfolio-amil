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
    <header className={styles.topbar} role="banner">
      {variant === 'home' && (
        <span className={styles.topbarInfo}>
          {hero.location}
        </span>
      )}
      {variant === 'page' && (
        <nav aria-label="Main navigation">
          <Link href="/" className={styles.topbarLink}>Home</Link>
        </nav>
      )}
    </header>
  );
};
