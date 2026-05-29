'use client';

import React from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel/SectionLabel';
import { about } from '@/lib/data';
import styles from './About.module.scss';

export const About: React.FC = () => {
  return (
    <section id="about" className={styles.section} aria-label="About me">
      <div className={styles.inner}>
        <SectionLabel>About Me</SectionLabel>
        <div className={styles.body}>
          {about.paragraphs.map((text, i) => (
            <p key={i} className={styles.paragraph}>{text}</p>
          ))}
        </div>
      </div>
    </section>
  );
};
