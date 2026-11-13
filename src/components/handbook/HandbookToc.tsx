'use client';

import React, { useEffect, useState } from 'react';
import type { TocHeading } from '@/lib/docs';
import styles from './Handbook.module.scss';

/** Distance from the viewport top at which a heading counts as "current" (sticky header + breathing room). */
const ACTIVE_OFFSET = 120;

export const HandbookToc: React.FC<{ headings: TocHeading[] }> = ({ headings }) => {
  const [activeId, setActiveId] = useState<string | undefined>(headings[0]?.id);

  useEffect(() => {
    if (!headings.length) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      let current = headings[0].id;
      for (const { id } of headings) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= ACTIVE_OFFSET) current = id;
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setActiveId(atBottom ? headings[headings.length - 1].id : current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headings]);

  return (
    <aside className={styles.toc}>
      {headings.length > 0 && (
        <nav aria-label="On this page" className={styles.tocInner}>
          <p className={styles.tocEyebrow}>On this page</p>
          <ul className={styles.tocList}>
            {headings.map((h) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  className={styles.tocLink}
                  data-depth={h.depth}
                  data-active={activeId === h.id || undefined}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  );
};
