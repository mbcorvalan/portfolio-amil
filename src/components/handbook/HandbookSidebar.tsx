'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu, X } from 'lucide-react';
import type { NavGroup as NavGroupNode, NavNode, NavPage } from '@/lib/docs';
import styles from './Handbook.module.scss';

/** Marks content that only exists in local development (never in production builds). */
const LocalBadge = () => (
  <span className={styles.localBadge} title="Only visible locally, excluded from production builds">
    local
  </span>
);

interface PageLinkProps {
  page: NavPage;
  pathname: string;
  onNavigate: () => void;
}

const PageLink: React.FC<PageLinkProps> = ({ page, pathname, onNavigate }) => {
  const active = page.href === pathname;
  return (
    <li>
      <Link
        href={page.href}
        className={styles.navItem}
        data-active={active || undefined}
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
      >
        {page.number !== undefined && <span className={styles.navNumber}>{page.number}</span>}
        <span>
          {page.title}
          {page.localOnly && <LocalBadge />}
        </span>
      </Link>
    </li>
  );
};

const NavGroup: React.FC<{ group: NavGroupNode; pathname: string; onNavigate: () => void }> = ({
  group,
  pathname,
  onNavigate,
}) => {
  const containsActive = group.children.some((c) => c.href === pathname);
  // Groups follow the current route (the active one is expanded) unless the
  // user toggled this group while on the current page.
  const [override, setOverride] = useState<{ path: string; open: boolean }>();
  const open = override?.path === pathname ? override.open : containsActive;
  const id = `hb-group-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <li>
      <button
        type="button"
        className={styles.groupToggle}
        data-active={containsActive || undefined}
        onClick={() => setOverride({ path: pathname, open: !open })}
        aria-expanded={open}
        aria-controls={id}
      >
        <span className={styles.groupText}>
          {group.label && <span className={styles.groupLabel}>{group.label}</span>}
          <span className={styles.groupTitle}>
            {group.title}
            {group.localOnly && <LocalBadge />}
          </span>
        </span>
        <ChevronRight size={16} strokeWidth={2} className={styles.chevron} data-open={open || undefined} />
      </button>
      {open && (
        <ul id={id} className={styles.navChildren}>
          {group.children.map((page) => (
            <PageLink key={page.href} page={page} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  );
};

interface HandbookSidebarProps {
  nav: NavNode[];
  title: string;
}

export const HandbookSidebar: React.FC<HandbookSidebarProps> = ({ nav, title }) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <aside className={styles.sidebar}>
      <button
        type="button"
        className={styles.mobileToggle}
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        aria-controls="handbook-nav"
      >
        {mobileOpen ? <X size={16} strokeWidth={2} /> : <Menu size={16} strokeWidth={2} />}
        Contents
      </button>
      <nav
        id="handbook-nav"
        className={styles.sidebarNav}
        data-open={mobileOpen || undefined}
        aria-label="Handbook contents"
      >
        <p className={styles.sidebarEyebrow}>{title}</p>
        <ul className={styles.navList}>
          {nav.map((node) =>
            node.type === 'page' ? (
              <PageLink key={node.href} page={node} pathname={pathname} onNavigate={close} />
            ) : (
              <NavGroup key={node.title} group={node} pathname={pathname} onNavigate={close} />
            ),
          )}
        </ul>
      </nav>
    </aside>
  );
};
