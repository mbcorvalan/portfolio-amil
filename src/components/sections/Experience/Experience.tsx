'use client';

import React, { useState } from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel/SectionLabel';
import { experiences } from '@/lib/data';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { experiencesEs, uiStrings } from '@/lib/i18n/translations';
import styles from './Experience.module.scss';

export const Experience: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null);
  const { lang } = useLanguage();
  const t = uiStrings[lang];
  const items = lang === 'es' ? experiencesEs : experiences;

  return (
    <section id="experience" className={styles.section}>
      <div className={styles.inner}>
        <SectionLabel>{t.sectionExperience}</SectionLabel>
        <ul className={styles.list}>
          {items.map((exp) => {
            const isOpen = openId === exp.id;
            return (
              <li key={exp.id} className={styles.item}>
                <div className={styles.meta}>
                  <div className={styles.year}>{exp.period}</div>
                  {exp.location && (
                    <div className={styles.location}>{exp.location}</div>
                  )}
                </div>
                <div className={styles.content}>
                  <p className={styles.company}>{exp.company}</p>
                  <p className={styles.role}>{exp.title}</p>
                  {exp.summary && (
                    <p className={styles.summary}>{exp.summary}</p>
                  )}
                  <button
                    type="button"
                    className={styles.toggle}
                    aria-expanded={isOpen}
                    aria-controls={`responsibilities-${exp.id}`}
                    onClick={() => setOpenId(isOpen ? null : exp.id)}
                  >
                    <span className={styles.toggleLabel}>{t.keyResponsibilities}</span>
                    <span className={styles.toggleIcon} aria-hidden="true">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <ul id={`responsibilities-${exp.id}`} className={styles.descList}>
                      {exp.bullets.map((bullet, i) => (
                        <li key={i} className={styles.desc}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
