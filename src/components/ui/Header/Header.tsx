'use client';

import React from 'react';
import { Link } from 'react-aria-components';
import { summary } from '@/lib/data';
import { uiStrings } from '@/lib/i18n/translations';
import styles from '@/components/sections/Hero/Hero.module.scss';

interface HeaderProps {
  variant?: 'home' | 'page';
}

export const Header: React.FC<HeaderProps> = ({ variant = 'home' }) => {
  const t = uiStrings;
  const nameWords = summary.headline.split(' ');
  const nameLead = nameWords.slice(0, -1).join(' ');
  const nameAccent = nameWords.slice(-1).join(' ');

  return (
    <header className={styles.topbar} role="banner">
      <Link href="/" className={styles.brand}>
        {nameLead} <span className={styles.brandAccent}>{nameAccent}</span>
      </Link>
      {variant === 'home' && (
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="#experience" className={styles.navLink}>{t.sectionExperience}</Link>
          <Link href="#projects" className={styles.navLink}>{t.navProjects}</Link>
          <Link href="/blog" className={styles.navLink}>{t.ctaBlog}</Link>
          <Link href="#contact" className={styles.navLink}>{t.sectionContact}</Link>
        </nav>
      )}
      {variant === 'page' && (
        <nav aria-label="Main navigation">
          <Link href="/" className={styles.topbarLink}>Home</Link>
        </nav>
      )}
    </header>
  );
};
