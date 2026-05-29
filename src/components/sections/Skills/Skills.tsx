'use client';

import React, { useEffect, useState } from 'react';
import { SectionLabel } from '@/components/ui/SectionLabel/SectionLabel';
import { skills } from '@/lib/data';
import styles from './Skills.module.scss';

const INTERVAL = 5000;

export const Skills: React.FC = () => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || reducedMotion) return;
    const id = setInterval(() => {
      setActive(p => (p + 1) % skills.length);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [paused]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      setActive(p => (p + 1) % skills.length);
      setPaused(true);
    } else if (e.key === 'ArrowLeft') {
      setActive(p => (p - 1 + skills.length) % skills.length);
      setPaused(true);
    }
  };

  return (
    <section id="skills" className={styles.section}>
      <div className={styles.inner}>
        <SectionLabel>Skills</SectionLabel>
        <div
          className={styles.carousel}
          role="region"
          aria-label="Skills"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className={styles.viewport}>
            <div
              className={styles.track}
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              {skills.map((group, i) => (
                <div
                  key={group.category}
                  className={styles.slide}
                  aria-hidden={i !== active}
                >
                  <p className={styles.categoryLabel}>{group.category}</p>
                  <div className={styles.pills}>
                    {group.items.map((skill) => (
                      <span key={skill} className={styles.pill}>{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <nav className={styles.dots} aria-label="Skill categories">
            {skills.map((group, i) => (
              <button
                key={group.category}
                aria-label={group.category}
                aria-current={i === active}
                className={`${styles.dot} ${i === active ? styles.dotActive : ''}`}
                onClick={() => { setActive(i); setPaused(true); }}
              />
            ))}
          </nav>

          <span className={styles.srOnly} aria-live="polite" aria-atomic="true">
            {skills[active].category}
          </span>
        </div>
      </div>
    </section>
  );
};
