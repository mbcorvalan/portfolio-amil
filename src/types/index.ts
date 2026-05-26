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