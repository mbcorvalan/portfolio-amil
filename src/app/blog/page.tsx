import type { Metadata } from 'next';
import { Blog } from '@/components/sections/Blog/Blog';

export const metadata: Metadata = {
  title: 'Blog | AMIL',
  description: 'Notes on frontend architecture, design systems, and AI-assisted development from Maria Belen Corvalan Amil.',
};

export default function BlogPage() {
  return (
    <main>
      <Blog />
    </main>
  );
}
