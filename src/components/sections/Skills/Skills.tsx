'use client';

import React from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel/SectionLabel';
import { skills } from '@/lib/data';
import styles from './Skills.module.scss';

export const Skills: React.FC = () => {
  return (
    <section id="skills" className={styles.section}>
      <div className={styles.inner}>
        <SectionLabel>Skills</SectionLabel>
        <div className={styles.grid}>
          {skills.map((skill) => (
            <span key={skill} className={styles.skill}>
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
