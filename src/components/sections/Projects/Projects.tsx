'use client';

import React from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel/SectionLabel';
import { categoryAccents } from '@/lib/categoryAccents';
import { projects } from '@/lib/data';
import { uiStrings } from '@/lib/i18n/translations';
import styles from './Projects.module.scss';

// Skill category each technology belongs to, so its pill takes that category's color
const techCategory: Record<string, string> = {
  React: 'Frontend',
  TypeScript: 'Frontend',
  'Node.js': 'Backend & Data',
  'WhatsApp API': 'Backend & Data',
  'LLM Integration': 'AI',
};

const pillAccent = (tech: string) => categoryAccents[techCategory[tech]] ?? categoryAccents.Frontend;

export const Projects: React.FC = () => {
  const t = uiStrings;
  const items = projects;

  return (
    <section id="projects" className={styles.section}>
      <div className={styles.inner}>
        <SectionLabel>{t.sectionProjects}</SectionLabel>
        <ul className={styles.list}>
          {items.map((project) => (
            <li key={project.id} className={styles.item}>
              <div className={styles.header}>
                <p className={styles.title}>{project.title}</p>
                {project.status && <span className={styles.status}>{project.status}</span>}
              </div>
              <p className={styles.description}>{project.description}</p>
              <div className={styles.pills}>
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className={styles.pill}
                    style={{ '--accent': pillAccent(tech) } as React.CSSProperties}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
