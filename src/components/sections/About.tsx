'use client';

import React from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel';
import styles from './About.module.scss';

export const About: React.FC = () => {
  return (
    <section id="about" className={styles.section} aria-label="About me">
      <div className={styles.inner}>
        <SectionLabel>About Me</SectionLabel>
        <div className={styles.body}>
          <p className={styles.paragraph}>
            Senior Frontend Developer with 6+ years of experience building scalable, accessible, and
            user-centered digital products. I specialize in frontend architecture, performance
            optimization, modern testing practices, and creating consistent experiences across
            different frameworks.
          </p>
          <p className={styles.paragraph}>
            I enjoy solving technical challenges through thoughtful collaboration, clean
            implementation, and a strong focus on quality. I&apos;m also interested in the practical
            use of AI to automate processes, improve development workflows, and make code creation
            more efficient.
          </p>
          <p className={styles.paragraph}>
            Beyond technology, I&apos;m passionate about football and animals.
          </p>
        </div>
      </div>
    </section>
  );
};
