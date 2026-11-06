'use client';

import React, { useState } from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel/SectionLabel';
import { experiences } from '@/lib/data';
import { uiStrings } from '@/lib/i18n/translations';
import styles from './Experience.module.scss';

export const Experience: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null);
  const t = uiStrings;
  const items = experiences;

  return (
    <section id="experience" className={styles.section}>
      <div className={styles.inner}>
        <SectionLabel>{t.sectionExperience}</SectionLabel>
        <ul className={styles.list}>
          {items.map((exp) => {
            const isOpen = openId === exp.id;
            return (
              <li key={exp.id} className={styles.item}>
                <p className={styles.year}>{exp.period}</p>
                <div className={styles.body}>
                  <div className={styles.titleRow}>
                    <p className={styles.role}>{exp.title}</p>
                    <span className={styles.separator} aria-hidden="true">—</span>
                    <p className={styles.company}>{exp.company}</p>
                  </div>
                  <div className={styles.content}>
                    {exp.summary && (
                      <p className={styles.summary}>{exp.summary}</p>
                    )}
                    {/* List renders above the toggle so the button stays below the revealed items */}
                    <div
                      id={`responsibilities-${exp.id}`}
                      className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
                      inert={!isOpen}
                    >
                      <ul className={styles.descList}>
                        {exp.bullets.map((bullet, i) => (
                          <li key={i} className={styles.desc}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
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
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
