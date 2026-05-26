'use client';

import React from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel';
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
                <p className={styles.company}>{exp.title}</p>
                <p className={styles.desc}>{exp.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
