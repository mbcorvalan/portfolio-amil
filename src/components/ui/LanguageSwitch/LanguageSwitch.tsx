'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import styles from './LanguageSwitch.module.scss';

export const LanguageSwitch: React.FC = () => {
  const { lang, setLang } = useLanguage();

  return (
    <div className={styles.switch} role="group" aria-label="Language switcher">
      <button
        type="button"
        className={styles.option}
        data-active={lang === 'en'}
        aria-pressed={lang === 'en'}
        onClick={() => setLang('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={styles.option}
        data-active={lang === 'es'}
        aria-pressed={lang === 'es'}
        onClick={() => setLang('es')}
      >
        ES
      </button>
    </div>
  );
};
