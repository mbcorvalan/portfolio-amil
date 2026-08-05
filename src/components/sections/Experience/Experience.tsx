'use client';

import React from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel/SectionLabel';
import { experiences } from '@/lib/data';
import styles from './Experience.module.scss';

export const Experience: React.FC = () => {
  return (
    <section id="experience" className={styles.section}>
      <div className={styles.inner}>
        <SectionLabel>Experience</SectionLabel>
        <ul className={styles.list}>
          {experiences.map((exp) => (
            <li key={exp.id} className={styles.item}>
              <div className={styles.year}>{exp.period}</div>
              <div className={styles.content}>
                <p className={styles.company}>{exp.company}</p>
                <p className={styles.role}>{exp.title}</p>
                {exp.summary && (
                  <p className={styles.summary}>{exp.summary}</p>
                )}
                {exp.summary && (
                  <p className={styles.responsibilitiesLabel}>Key responsibilities:</p>
                )}
                <ul className={styles.descList}>
                  {exp.bullets.map((bullet, i) => (
                    <li key={i} className={styles.desc}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
