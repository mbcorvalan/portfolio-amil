import { Experience, Skill, SummaryData } from '@/types';

export const uiStrings = {
  en: {
    sectionExperience: 'Experience',
    skillsTitle: 'Core skills',
    sectionContact: 'Contact',
    ctaViewExperience: 'View experience',
    ctaDownloadResume: 'Download resume',
    ctaContactMe: 'Contact me',
    ctaBlog: 'Blog',
    keyResponsibilities: 'Key responsibilities',
    youtubeChannel: 'YouTube Channel',
  },
  es: {
    sectionExperience: 'Experiencia',
    skillsTitle: 'Habilidades clave',
    sectionContact: 'Contacto',
    ctaViewExperience: 'Ver experiencia',
    ctaDownloadResume: 'Descargar CV',
    ctaContactMe: 'Contactarme',
    ctaBlog: 'Blog',
    keyResponsibilities: 'Responsabilidades clave',
    youtubeChannel: 'Canal de YouTube',
  },
};

export const summaryEs: SummaryData = {
  headline: 'María Belén Corvalán Amil',
  role: 'Ingeniera de Software Senior · Arquitecta Frontend',
  subtitle: 'Arquitectura Frontend · TypeScript · React · Angular · Node.js · IA Generativa',
  description: 'Transformo necesidades complejas de producto y negocio en soluciones de software escalables, accesibles, de alto rendimiento y mantenibles. Sólidos conocimientos de integración backend y un interés creciente y práctico en DevOps. Colaborativa y orientada a la comunicación, con fuerte espíritu de equipo y una motivación constante por aprender. Aprovecho la IA generativa para acelerar el análisis, la documentación, el testing y la automatización de flujos de trabajo.',
  descriptionMobile: 'Transformo necesidades complejas de producto y negocio en soluciones escalables, accesibles y de alto rendimiento. Sólidos conocimientos de integración backend, un interés creciente en DevOps y un espíritu colaborativo orientado al equipo. Aprovecho la IA generativa para acelerar el análisis, la documentación, el testing y la automatización.',
};

export const experiencesEs: Experience[] = [
  {
    id: '1',
    title: 'Desarrolladora Frontend Senior',
    company: 'Hexaware',
    period: '2024 — Presente',
    location: 'Remoto',
    summary: 'Trabajo en EY Motif, un sistema de diseño empresarial que da soporte a múltiples productos de EY.',
    bullets: [
      'Arquitectura frontend escalable y desarrollo de componentes reutilizables.',
      'Componentes de interfaz accesibles construidos con React, Angular, TypeScript y Storybook.',
      'Consistencia del sistema de diseño entre frameworks y experiencias de producto.',
      'Traducción de especificaciones de diseño y requerimientos técnicos en soluciones listas para producción.',
      'Análisis de código, documentación y generación de tests asistidos por IA.',
      'Flujos de CI/CD y procesos de release confiables.',
      'Colaboración interdisciplinaria y responsabilidad end-to-end sobre la entrega.',
    ],
    skills: ['React', 'Angular', 'TypeScript', 'Design Systems'],
  },
  {
    id: '2',
    title: 'Desarrolladora Frontend Senior',
    company: 'Hero Digital',
    period: '2021 — 2024',
    location: 'Remoto',
    summary: 'Entrega de experiencias digitales a gran escala para clientes empresariales, incluyendo Zoom, Jefferson Health y K. Hovnanian Homes.',
    bullets: [
      'Arquitectura frontend escalable y desarrollo de componentes reutilizables.',
      'Soluciones empresariales construidas con React, TypeScript, Storybook y Adobe Experience Manager.',
      'Traducción de requerimientos de UX y negocio en experiencias listas para producción.',
      'Desarrollo de componentes reutilizables de AEM y funcionalidad de e-commerce.',
      'Integraciones de APIs REST y analítica en múltiples líneas de producto.',
      'Implementación de Google Analytics para plataformas digitales de alto tráfico.',
      'Colaboración interdisciplinaria y responsabilidad end-to-end sobre la entrega.',
    ],
    skills: ['React', 'TypeScript', 'AEM', 'Storybook'],
  },
  {
    id: '3',
    title: 'Desarrolladora Frontend',
    company: 'TradeHelm, Inc.',
    period: '2020 — 2021',
    location: 'Remoto',
    summary: 'Construcción de experiencias digitales responsivas y mantenibles, traduciendo diseños de Figma y requerimientos de UX en soluciones frontend reutilizables.',
    bullets: [
      'Desarrollo de interfaces responsivas y cross-browser.',
      'Desarrollo de componentes reutilizables con React y Angular.',
      'Traducción de diseños de Figma y especificaciones de UX en experiencias listas para producción.',
      'Integración frontend con Adobe Experience Manager y APIs REST.',
      'Colaboración con ingenieros backend en contratos de datos y reglas de validación.',
      'Resolución de problemas de integración, asegurando flujos de datos confiables.',
      'Colaboración interdisciplinaria entre diseño, frontend y backend.',
    ],
    skills: ['React', 'Angular', 'AEM', 'Testing'],
  },
  {
    id: '4',
    title: 'Desarrolladora Frontend',
    company: 'Cencosud S.A.',
    period: '2018 — 2020',
    location: 'Presencial',
    summary: 'Rediseño y modernización de la plataforma de e-commerce Easy Argentina, mejorando la usabilidad a lo largo del recorrido de compra.',
    bullets: [
      'Desarrollo de interfaces de e-commerce responsivas con React.',
      'Modernización del descubrimiento de productos, navegación, filtros y páginas de detalle de producto.',
      'Traducción de requerimientos de UX en soluciones mantenibles y listas para producción.',
      'Integración de datos de catálogo, precios e inventario.',
      'Gestión de información compleja de productos en interfaces de cara al cliente.',
      'Resolución de problemas de usabilidad y navegación en múltiples recorridos de usuario.',
      'Colaboración interdisciplinaria con equipos de diseño, producto y backend.',
    ],
    skills: ['React', 'TypeScript', 'E-commerce'],
  },
  {
    id: '5',
    title: 'Analista de Control de Calidad de Software',
    company: 'MRM',
    period: '2016 — 2018',
    location: 'Presencial',
    summary: 'Aseguramiento de calidad end-to-end para aplicaciones web, garantizando releases confiables y experiencias de usuario consistentes entre navegadores y dispositivos.',
    bullets: [
      'Testing manual, de regresión, smoke y automatizado.',
      'Validación de flujos de negocio críticos y requerimientos funcionales.',
      'Testing de diseño responsivo y compatibilidad cross-browser.',
      'Identificación, documentación y seguimiento de defectos entre releases.',
      'Colaboración con desarrolladores y equipos de producto para resolver problemas de calidad.',
      'Verificación de fixes y prevención de regresiones.',
      'Desarrollo de una mentalidad de ingeniería orientada a la calidad que sigue guiando mi trabajo frontend.',
    ],
    skills: ['QA', 'Testing', 'Agile'],
  },
];

export const skillsEs: Skill[] = [
  {
    category: 'Frontend',
    items: ['React.js', 'Next.js', 'Angular', 'TypeScript', 'JavaScript (ES6+)', 'HTML5', 'CSS3', 'Sass', 'Storybook.js', 'Design Systems', 'Librerías de Componentes', 'Design Tokens', 'Diseño Responsive'],
  },
  {
    category: 'Backend y Datos',
    items: ['Node.js / Nest.js', 'APIs REST', 'GraphQL', 'SQL & NoSQL', 'Python'],
  },
  {
    category: 'Calidad',
    items: ['Testing Unitario', 'Automatización de Testing', 'Testing de Integración', 'End-to-End (E2E)', 'WCAG'],
  },
  {
    category: 'Entrega',
    items: ['Git', 'CI/CD', 'Azure'],
  },
  {
    category: 'IA',
    items: ['Integración de LLMs', 'Ingeniería de Prompts', 'Copilot', 'Claude', 'Cursor'],
  },
];
