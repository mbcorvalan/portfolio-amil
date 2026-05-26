'use client';

import React from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { projects } from '@/lib/data';
import styles from './Project.module.scss';

export const Projects: React.FC = () => {
  return (
    <section id="projects" className={styles.section}>
      <div className={styles.inner}>
        <SectionLabel>Proyecto personal</SectionLabel>
        {projects.map((project) => (
          <div key={project.id} className={styles.card}>
            <div className={styles.title}>{project.title}</div>
            <div className={styles.desc}>{project.description}</div>
            <span className={styles.badge}>En desarrollo · npm</span>
          </div>
        ))}
      </div>
    </section>
  );
};
