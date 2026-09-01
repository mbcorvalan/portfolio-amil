'use client';

import React from 'react';
import { Link } from 'react-aria-components';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { uiStrings } from '@/lib/i18n/translations';
import styles from '@/components/sections/Hero/Hero.module.scss';

interface HeaderProps {
  variant?: 'home' | 'page';
}

export const Header: React.FC<HeaderProps> = ({ variant = 'home' }) => {
  const { lang } = useLanguage();
  const t = uiStrings[lang];

  return (
    <header className={styles.topbar} role="banner">
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
