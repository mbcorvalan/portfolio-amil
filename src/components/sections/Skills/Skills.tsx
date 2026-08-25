'use client';

import React from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel/SectionLabel';
import { skills } from '@/lib/data';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { skillsEs, uiStrings } from '@/lib/i18n/translations';
import styles from './Skills.module.scss';

export const Skills: React.FC = () => {
  const { lang } = useLanguage();
  const t = uiStrings[lang];
  const groups = lang === 'es' ? skillsEs : skills;

  return (
    <section id="skills" className={styles.section}>
      <div className={styles.inner}>
        <SectionLabel>{t.skillsTitle}</SectionLabel>
        <div className={styles.list}>
          {groups.map((group) => (
            <div key={group.category} className={styles.row}>
              <p className={styles.categoryLabel}>{group.category}</p>
              <div className={styles.pills}>
                {group.items.map((skill) => (
                  <span key={skill} className={styles.pill}>{skill}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
