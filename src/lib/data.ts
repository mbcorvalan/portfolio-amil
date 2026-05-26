import { Experience, Skill } from '@/types';

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

export const skills: string[] = [
  'React',
  'Next.js',
  'Angular',
  'TypeScript',
  'JavaScript',
  'CSS / Tailwind',
  'Node.js',
  'Git',
  'Testing',
  'Figma',
];
