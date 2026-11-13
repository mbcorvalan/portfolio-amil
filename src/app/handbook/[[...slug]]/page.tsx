import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { HandbookToc } from '@/components/handbook/HandbookToc';
import { getAllDocSlugs, getDoc, getDocEntry, HANDBOOK_TITLE } from '@/lib/docs';
import styles from '@/components/handbook/Handbook.module.scss';

interface HandbookPageProps {
  params: Promise<{ slug?: string[] }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: HandbookPageProps): Promise<Metadata> {
  const { slug = [] } = await params;
  const entry = getDocEntry(slug);
  if (!entry) return { title: `${HANDBOOK_TITLE} | AMIL` };
  return {
    title: slug.length ? `${entry.title} · ${HANDBOOK_TITLE} | AMIL` : `${HANDBOOK_TITLE} | AMIL`,
    description: entry.description,
  };
}

export default async function HandbookPage({ params }: HandbookPageProps) {
  const { slug = [] } = await params;
  const doc = await getDoc(slug);
  if (!doc) notFound();

  const eyebrow = doc.group
    ? [doc.group.label ? `${doc.group.label} · ${doc.group.title}` : doc.group.title]
    : [HANDBOOK_TITLE];
  if (doc.number !== undefined) eyebrow.push(`Chapter ${doc.number}`);

  return (
    <>
      <article className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          {eyebrow.map((crumb, i) => (
            <span key={crumb} className={styles.crumb}>
              {crumb}
              {i < eyebrow.length - 1 && <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />}
            </span>
          ))}
        </nav>
        <h1 className={styles.title}>{doc.title}</h1>
        {doc.meta.length > 0 && (
          <p className={styles.meta}>
            {doc.meta.map((item, i) => (
              <React.Fragment key={item}>
                {i > 0 && <span aria-hidden="true">·</span>}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </p>
        )}

        <div className="handbook-prose" dangerouslySetInnerHTML={{ __html: doc.html }} />

        {(doc.prev || doc.next) && (
          <nav className={styles.pager} aria-label="Pagination">
            {doc.prev ? (
              <Link href={doc.prev.href} className={styles.pagerLink}>
                <span className={styles.pagerLabel}>
                  <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" /> Previous
                </span>
                <span className={styles.pagerTitle}>{doc.prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {doc.next && (
              <Link href={doc.next.href} className={`${styles.pagerLink} ${styles.pagerNext}`}>
                <span className={styles.pagerLabel}>
                  Next <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className={styles.pagerTitle}>{doc.next.title}</span>
              </Link>
            )}
          </nav>
        )}
      </article>
      <HandbookToc headings={doc.headings} />
    </>
  );
}
