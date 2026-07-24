import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { Header } from '@/components/ui/Header/Header';
import { hero } from '@/lib/data';
import { BlogContentBlock, BlogPost } from '@/types';
import styles from './BlogPostDetail.module.scss';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const renderBlock = (block: BlogContentBlock, key: number): React.ReactNode => {
  switch (block.type) {
    case 'heading': {
      const Tag = block.level === 2 ? 'h2' : 'h3';
      const className = block.level === 2 ? styles.h2 : styles.h3;
      return <Tag key={key} className={className}>{block.text}</Tag>;
    }
    case 'paragraph':
      return <p key={key} className={styles.paragraph}>{block.text}</p>;
    case 'note':
      return <p key={key} className={styles.note}>{block.text}</p>;
    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag key={key} className={styles.list}>
          {block.items.map((item, i) => (
            <li key={i} className={styles.listItem}>{item}</li>
          ))}
        </ListTag>
      );
    }
    case 'image':
      return (
        <figure key={key} className={styles.figure}>
          {block.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.src} alt={block.caption} className={styles.image} />
          ) : (
            <div className={styles.imagePlaceholder} aria-hidden="true">
              <ImageIcon size={22} strokeWidth={1.5} />
            </div>
          )}
          <figcaption className={styles.caption}>{block.caption}</figcaption>
        </figure>
      );
    default:
      return null;
  }
};

interface BlogPostDetailProps {
  post: BlogPost;
}

export const BlogPostDetail: React.FC<BlogPostDetailProps> = ({ post }) => {
  return (
    <>
      <div className={styles.headerWrap}>
        <Header variant="page" />
      </div>
      <article className={styles.section}>
        <div className={styles.inner}>
          <Link href="/blog" className={styles.back} aria-label="Back to blog">
            <ArrowLeft size={16} strokeWidth={1.75} />
          </Link>
          <div className={styles.meta}>
            <span>By {hero.name}</span>
            <span>·</span>
            <span>{formatDate(post.date)}</span>
            <span>·</span>
            <span>{post.readTime}</span>
          </div>
          <h1 className={styles.title}>{post.title}</h1>
          {post.dek && <p className={styles.dek}>{post.dek}</p>}
          <div className={styles.tags}>
            {post.tags.map((tag) => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
          <div className={styles.body}>
            {post.content.map((block, i) => renderBlock(block, i))}
          </div>
        </div>
      </article>
    </>
  );
};
