'use client';

import React from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel/SectionLabel';
import { projects } from '@/lib/data';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { projectsEs, uiStrings } from '@/lib/i18n/translations';
import styles from './Projects.module.scss';

export const Projects: React.FC = () => {
  const { lang } = useLanguage();
  const t = uiStrings[lang];
  const items = lang === 'es' ? projectsEs : projects;

  return (
    <section id="projects" className={styles.section}>
      <div className={styles.inner}>
        <SectionLabel>{t.sectionProjects}</SectionLabel>
        <ul className={styles.list}>
          {items.map((project) => (
            <li key={project.id} className={styles.item}>
              <div className={styles.header}>
                <p className={styles.title}>{project.title}</p>
                <span className={styles.status}>{project.status}</span>
              </div>
              <p className={styles.subtitle}>{project.subtitle}</p>
              <p className={styles.description}>{project.description}</p>
              <div className={styles.pills}>
                {project.technologies.map((tech) => (
                  <span key={tech} className={styles.pill}>{tech}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
