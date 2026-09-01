'use client';

import React from 'react';
import { Link } from 'react-aria-components';
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
        <p className={styles.intro}>{t.projectsIntro}</p>
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
              {project.github && (
                <Link
                  href={project.github}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.link}
                  aria-label={`${project.title} — ${t.ctaViewOnGithub} (opens in new tab)`}
                >
                  {t.ctaViewOnGithub}
                </Link>
              )}
            </li>
          ))}
        </ul>
        <Link
          href="https://github.com/mbcorvalan"
          target="_blank"
          rel="noreferrer"
          className={styles.githubCta}
          aria-label="GitHub profile (opens in new tab)"
        >
          {t.ctaMoreOnGithub}
        </Link>
      </div>
    </section>
  );
};
