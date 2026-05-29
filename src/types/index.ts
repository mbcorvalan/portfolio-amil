export interface Experience {
  id: string;
  title: string;
  company: string;
  period: string;
  description: string;
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

export interface AboutData {
  paragraphs: string[];
}

export interface SummaryData {
  tagline: string;
  description: string;
}

export interface HeroData {
  name: string;
  location: string;
  locationShort: string;
}