export interface Experience {
  id: string;
  title: string;
  company: string;
  period: string;
  summary?: string;
  bullets: string[];
  skills: string[];
}

export interface Skill {
  category: string;
  items: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  link?: string;
  github?: string;
  image?: string;
}

export interface ContactForm {
  name: string;
  email: string;
  message: string;
}

export interface SummaryData {
  headline: string;
  role: string;
  subtitle: string;
  description: string;
  descriptionMobile: string;
}

export interface HeroData {
  name: string;
  location: string;
  locationShort: string;
}

export type BlogContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'image'; id: string; caption: string; alt: string; src?: string }
  | { type: 'note'; text: string };

export interface BlogPost {
  slug: string;
  title: string;
  dek?: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  coverImage?: string;
  content: BlogContentBlock[];
}