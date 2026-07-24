import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogPostDetail } from '@/components/sections/Blog/BlogPostDetail';
import { blogPosts, hero } from '@/lib/data';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return { title: 'Post not found | AMIL' };
  }

  return {
    title: `${post.title} | AMIL`,
    description: post.excerpt,
    authors: [{ name: hero.name }],
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <main>
      <BlogPostDetail post={post} />
    </main>
  );
}
