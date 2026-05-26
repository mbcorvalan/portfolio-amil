'use client';

import React from 'react';
import { Link } from 'react-aria-components';
import { SectionLabel } from '@/components/ui/SectionLabel';
import styles from './Contact.module.scss';

export const Contact: React.FC = () => {
  return (
    <section id="contact" className={styles.section} aria-label="Contact">
      <div className={styles.inner}>
        <SectionLabel>Contact</SectionLabel>
        <div className={styles.row}>
          <Link href="mailto:bcorvalan.amil@gmail.com" className={styles.link}>
            bcorvalan.amil@gmail.com
          </Link>
          <Link
            href="https://www.linkedin.com/in/mbcorvalan/"
            target="_blank"
            rel="noreferrer"
            className={styles.link}
            aria-label="LinkedIn profile (opens in new tab)"
          >
            LinkedIn
          </Link>
          <Link
            href="https://github.com/mbcorvalan"
            target="_blank"
            rel="noreferrer"
            className={styles.link}
            aria-label="GitHub profile (opens in new tab)"
          >
            GitHub
          </Link>
          <Link
            href="https://www.youtube.com/@bcorvalanAmil"
            target="_blank"
            rel="noreferrer"
            className={styles.link}
            aria-label="YouTube channel (opens in new tab)"
          >
            YouTube Channel
          </Link>
        </div>
      </div>
    </section>
  );
};
