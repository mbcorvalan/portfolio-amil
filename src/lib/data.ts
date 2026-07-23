import { AboutData, Experience, HeroData, Skill, SummaryData } from '@/types';

export const experiences: Experience[] = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'Hexaware',
    period: '2024 — Present',
    description: 'Contributing to EY Motif, an enterprise design system used across multiple EY products, building scalable and accessible UI components with React, Angular, TypeScript, and Storybook. Translating Figma specs and design tokens into production-ready components, analyzing React/Web Component migration paths, and applying generative AI to automate code analysis, documentation, and test generation.',
    skills: ['React', 'Angular', 'TypeScript', 'Design Systems'],
  },
  {
    id: '2',
    title: 'Senior Frontend Developer',
    company: 'Hero Digital',
    period: '2021 — 2024',
    description: 'Delivered large-scale digital experiences for enterprise clients including Zoom, Jefferson Health, and K. Hovnanian Homes, using React, TypeScript, Storybook, and Adobe Experience Manager (AEM). Built reusable AEM components and e-commerce features, integrated REST APIs and analytics, and implemented Google Analytics tracking across high-traffic platforms.',
    skills: ['React', 'TypeScript', 'AEM', 'Storybook'],
  },
  {
    id: '3',
    title: 'Frontend Developer',
    company: 'TradeHelm, Inc.',
    period: '2020 — 2021',
    description: 'Built responsive, cross-browser interfaces with React and Angular, translating Figma and UX specs into reusable, maintainable components. Integrated frontend apps with AEM and REST APIs, collaborating closely with backend engineers on data contracts and validation rules.',
    skills: ['React', 'Angular', 'AEM', 'Testing'],
  },
  {
    id: '4',
    title: 'Frontend Developer',
    company: 'Cencosud S.A.',
    period: '2018 — 2020',
    description: 'Redesigned and modernized the Easy Argentina e-commerce platform with React, working across a complex product catalog and resolving usability issues in product discovery, navigation, filters, and product pages. Integrated catalog, pricing, and inventory data into responsive customer-facing interfaces.',
    skills: ['React', 'TypeScript', 'E-commerce'],
  },
  {
    id: '5',
    title: 'Software Quality Assurance Analyst',
    company: 'MRM',
    period: '2016 — 2018',
    description: 'Performed end-to-end QA for web applications through manual, regression, smoke, and automated testing, validating business flows, responsive layouts, and cross-browser compatibility. Built a quality-oriented engineering mindset that carries into current frontend work.',
    skills: ['QA', 'Testing', 'Agile'],
  },
];

export const hero: HeroData = {
  name: 'Maria Belen Corvalan Amil',
  location: 'Buenos Aires, Argentina',
  locationShort: 'AR',
};

export const summary: SummaryData = {
  tagline: 'Senior Software Developer',
  description: '8+ years building scalable, user-centered apps. Focused on architecture, accessibility & performance, leveraging AI and automation to ship faster and smarter.',
};

export const about: AboutData = {
  paragraphs: [
    'Developer with 8+ years of experience building scalable, accessible, and user-centered digital products. I specialize in frontend architecture, performance optimization, modern testing practices, and creating consistent experiences across different frameworks complemented by backend development and database integration.',
    'I enjoy solving technical challenges through thoughtful collaboration, clean implementation, and a strong focus on quality. I actively use AI tools to automate processes, accelerate development workflows, and ship better products faster.',
  ],
};

export const skills: Skill[] = [
  {
    category: 'Development',
    items: ['React', 'Next.js', 'Angular', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'Sass', 'Node.js / Express', 'GraphQL', 'PostgreSQL', 'MongoDB', 'SQL'],
  },
  {
    category: 'Architecture & Design Systems',
    items: ['Design Systems', 'Component Libraries', 'Micro Frontends', 'Design Tokens', 'Responsive Design', 'Adobe Experience Manager (AEM)'],
  },
  {
    category: 'Quality & Testing',
    items: ['Unit Testing', 'Regression Testing', 'Test Automation', 'Accessibility Testing (WCAG)', 'Code Reviews'],
  },
  {
    category: 'AI & Automation',
    items: ['Cursor / Copilot / Claude', 'Prompt Engineering', 'OpenAI & Anthropic API', 'AI-assisted Development', 'n8n / Make / Zapier', 'GitHub Actions', 'Node.js Scripting'],
  },
  {
    category: 'Tooling & Workflow',
    items: ['Git', 'Figma', 'Storybook', 'CI/CD', 'Agile/Scrum', 'Jira', 'Google Analytics', 'Performance Optimization'],
  },
];
