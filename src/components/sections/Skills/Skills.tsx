'use client';

import React, { useState } from 'react';
import { CodeXml, Database, Plus, Rocket, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import { SectionLabel } from '@/components/ui/SectionLabel/SectionLabel';
import { categoryAccents } from '@/lib/categoryAccents';
import { skills } from '@/lib/data';
import { uiStrings } from '@/lib/i18n/translations';
import styles from './Skills.module.scss';

// Icon and accent color per category; unknown categories fall back to the first entry's look.
const categoryStyles: Record<string, { icon: LucideIcon; accent: string }> = {
  Frontend: { icon: CodeXml, accent: categoryAccents.Frontend },
  'Backend & Data': { icon: Database, accent: categoryAccents['Backend & Data'] },
  Quality: { icon: ShieldCheck, accent: categoryAccents.Quality },
  Delivery: { icon: Rocket, accent: categoryAccents.Delivery },
  AI: { icon: Sparkles, accent: categoryAccents.AI },
};

const fallbackStyle = categoryStyles.Frontend;

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const Skills: React.FC = () => {
  const t = uiStrings;
  const groups = skills;
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggle = (category: string) => {
    setOpenCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <section id="skills" className={styles.section}>
      <div className={styles.inner}>
        <SectionLabel>{t.skillsTitle}</SectionLabel>
        <div className={styles.grid}>
          {groups.map((group) => {
            const { icon: Icon, accent } = categoryStyles[group.category] ?? fallbackStyle;
            const isOpen = openCategories.has(group.category);
            const panelId = `skills-${slug(group.category)}`;

            return (
              <article
                key={group.category}
                className={`${styles.card} ${isOpen ? styles.cardOpen : ''}`}
                style={{ '--accent': accent } as React.CSSProperties}
              >
                <header className={styles.cardHeader}>
                  <span className={styles.iconBox} aria-hidden="true">
                    <Icon size={24} strokeWidth={2} />
                  </span>
                  <div className={styles.titleBlock}>
                    <h3 className={styles.cardTitle}>{group.category}</h3>
                    <span className={styles.count}>{group.items.length} skills</span>
                  </div>
                  <button
                    type="button"
                    className={styles.toggle}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    aria-label={`${isOpen ? 'Hide' : 'Show'} ${group.category} skills`}
                    onClick={() => toggle(group.category)}
                  >
                    <Plus size={20} strokeWidth={2.25} aria-hidden="true" />
                  </button>
                </header>

                <div id={panelId} className={styles.panel} inert={!isOpen}>
                  <ul className={styles.items}>
                    {group.items.map((skill) => (
                      <li key={skill} className={styles.item}>{skill}</li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
