import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/ui/Header/Header';
import { blogPosts } from '@/lib/data';
import styles from './Blog.module.scss';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export const Blog: React.FC = () => {
  return (
    <>
      <div className={styles.headerWrap}>
        <Header variant="page" />
      </div>
      <section className={styles.section} aria-label="Blog">
        <div className={styles.inner}>
          <h1 className={styles.pageTitle}>Last Post</h1>
          <ul className={styles.list}>
            {blogPosts.map((post) => (
              <li key={post.slug} className={styles.item}>
                <Link href={`/blog/${post.slug}`} className={styles.postLink}>
                  <span className={styles.thumb} aria-hidden="true">
                    {post.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.coverImage} alt="" className={styles.thumbImage} />
                    ) : (
                      <span className={styles.thumbMark}>{post.title.charAt(0)}</span>
                    )}
                  </span>
                  <span className={styles.content}>
                    <span className={styles.category}>{post.tags[0]}</span>
                    <span className={styles.title}>{post.title}</span>
                    <span className={styles.subtitle}>{formatDate(post.date)} · {post.readTime}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
};
