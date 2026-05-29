import { AboutData, Experience, HeroData, Skill, SummaryData } from '@/types';

export const experiences: Experience[] = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'Acsys',
    period: '2024 — Present',
    description: 'Developing scalable, accessible UI components for EY Motif using React and Angular. Contributing to frontend architecture, CI/CD practices, and performance optimization.',
    skills: ['React', 'Angular', 'TypeScript', 'CI/CD'],
  },
  {
    id: '2',
    title: 'Senior Frontend Developer',
    company: 'Hero Digital',
    period: '2021 — 2024',
    description: 'Built responsive and accessible web experiences with React and Angular. Developed interactive UI components via Storybook and worked in Agile teams on projects for clients like Zoom.',
    skills: ['React', 'Angular', 'Storybook', 'Accessibility'],
  },
  {
    id: '3',
    title: 'Frontend Developer',
    company: 'TradeHelm, Inc.',
    period: '2020 — 2021',
    description: 'Built responsive interfaces with React and Angular in cross-functional teams. Integrated frontend apps with CMS platforms and focused on unit testing and iterative delivery.',
    skills: ['React', 'Angular', 'CMS', 'Testing'],
  },
  {
    id: '4',
    title: 'Frontend Developer',
    company: 'Cencosud S.A.',
    period: '2018 — 2020',
    description: 'Redesigned and developed the Easy Argentina website using React.js, modernizing the interface and collaborating with cross-functional teams to align digital solutions with business needs.',
    skills: ['React', 'TypeScript'],
  },
  {
    id: '5',
    title: 'QA Analyst',
    company: 'MRM',
    period: '2016 — 2018',
    description: 'Conducted frontend testing combining manual and automated approaches within Agile teams. Executed smoke, regression, and unit tests to ensure reliable software delivery.',
    skills: ['QA', 'Testing', 'Agile'],
  },
];

export const hero: HeroData = {
  name: 'Maria Belen Corvalan Amil',
  location: 'Buenos Aires, Argentina',
  locationShort: 'AR',
};

export const summary: SummaryData = {
  tagline: 'Senior Developer · AI & Automation',
  description: '6+ years building scalable, user-centered apps. Focused on architecture, accessibility & performance, leveraging AI and automation to ship faster and smarter.',
};

export const about: AboutData = {
  paragraphs: [
    'Developer with 6+ years of experience building scalable, accessible, and user-centered digital products. I specialize in frontend architecture, performance optimization, modern testing practices, and creating consistent experiences across different frameworks complemented by backend development and database integration.',
    'I enjoy solving technical challenges through thoughtful collaboration, clean implementation, and a strong focus on quality. I actively use AI tools to automate processes, accelerate development workflows, and ship better products faster.',
    "Beyond technology, I'm passionate about football and animals.",
  ],
};

export const skills: Skill[] = [
  {
    category: 'Development',
    items: ['React', 'Next.js', 'Angular', 'TypeScript', 'JavaScript', 'CSS', 'Node.js / Express', 'GraphQL', 'PostgreSQL', 'MongoDB', 'SQL'],
  },
  {
    category: 'AI & Automation',
    items: ['Cursor / Copilot / Claude', 'Prompt Engineering', 'OpenAI & Anthropic API', 'n8n / Make / Zapier', 'GitHub Actions', 'Node.js Scripting'],
  },
  {
    category: 'Tooling & Workflow',
    items: ['Git', 'Figma', 'Node.js', 'Storybook', 'Testing', 'CI/CD'],
  },
];
