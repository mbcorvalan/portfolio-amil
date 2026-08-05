import { BlogPost, Experience, HeroData, Skill, SummaryData } from '@/types';

export const experiences: Experience[] = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'Hexaware',
    period: '2024 — Present',
    summary: 'Working on EY Motif, an enterprise design system supporting multiple EY products.',
    bullets: [
      'Scalable frontend architecture and reusable component development.',
      'Accessible UI components built with React, Angular, TypeScript, and Storybook.',
      'Design-system consistency across frameworks and product experiences.',
      'Translation of design specifications and technical requirements into production-ready solutions.',
      'AI-assisted code analysis, documentation, and test generation.',
      'CI/CD workflows and reliable release processes.',
      'Cross-functional collaboration and end-to-end delivery ownership.',
    ],
    skills: ['React', 'Angular', 'TypeScript', 'Design Systems'],
  },
  {
    id: '2',
    title: 'Senior Frontend Developer',
    company: 'Hero Digital',
    period: '2021 — 2024',
    summary: 'Delivered large-scale digital experiences for enterprise clients, including Zoom, Jefferson Health, and K. Hovnanian Homes.',
    bullets: [
      'Scalable frontend architecture and reusable component development.',
      'Enterprise solutions built with React, TypeScript, Storybook, and Adobe Experience Manager.',
      'Translation of UX and business requirements into production-ready experiences.',
      'Development of reusable AEM components and e-commerce functionality.',
      'REST API and analytics integrations across multiple product lines.',
      'Google Analytics implementation for high-traffic digital platforms.',
      'Cross-functional collaboration and end-to-end delivery ownership.',
    ],
    skills: ['React', 'TypeScript', 'AEM', 'Storybook'],
  },
  {
    id: '3',
    title: 'Frontend Developer',
    company: 'TradeHelm, Inc.',
    period: '2020 — 2021',
    summary: 'Built responsive and maintainable digital experiences, translating Figma designs and UX requirements into reusable frontend solutions.',
    bullets: [
      'Responsive and cross-browser interface development.',
      'Reusable component development with React and Angular.',
      'Translation of Figma designs and UX specifications into production-ready experiences.',
      'Frontend integration with Adobe Experience Manager and REST APIs.',
      'Collaboration with backend engineers on data contracts and validation rules.',
      'Troubleshooting integration issues and ensuring reliable data flows.',
      'Cross-functional collaboration across design, frontend, and backend teams.',
    ],
    skills: ['React', 'Angular', 'AEM', 'Testing'],
  },
  {
    id: '4',
    title: 'Frontend Developer',
    company: 'Cencosud S.A.',
    period: '2018 — 2020',
    summary: 'Redesigned and modernized the Easy Argentina e-commerce platform, improving usability across the customer shopping journey.',
    bullets: [
      'Development of responsive e-commerce interfaces with React.',
      'Modernization of product discovery, navigation, filters, and product detail pages.',
      'Translation of UX requirements into maintainable, production-ready solutions.',
      'Integration of catalog, pricing, and inventory data.',
      'Management of complex product information across customer-facing interfaces.',
      'Resolution of usability and navigation issues across multiple user journeys.',
      'Cross-functional collaboration with design, product, and backend teams.',
    ],
    skills: ['React', 'TypeScript', 'E-commerce'],
  },
  {
    id: '5',
    title: 'Software Quality Assurance Analyst',
    company: 'MRM',
    period: '2016 — 2018',
    summary: 'Performed end-to-end quality assurance for web applications, helping ensure reliable releases and consistent user experiences across browsers and devices.',
    bullets: [
      'Manual, regression, smoke, and automated testing.',
      'Validation of critical business flows and functional requirements.',
      'Responsive layout and cross-browser compatibility testing.',
      'Identification, documentation, and tracking of defects across releases.',
      'Collaboration with developers and product teams to resolve quality issues.',
      'Verification of fixes and prevention of regressions.',
      'Development of a quality-oriented engineering mindset that continues to inform my frontend work.',
    ],
    skills: ['QA', 'Testing', 'Agile'],
  },
];

export const hero: HeroData = {
  name: 'Maria Belen Corvalan Amil',
  location: 'Buenos Aires, Argentina',
  locationShort: 'AR',
};

export const summary: SummaryData = {
  headline: 'María Belén Corvalán Amil',
  role: 'Senior Software Engineer · Frontend Specialist',
  subtitle: 'Frontend Architecture · TypeScript · React · Angular · Node.js · Generative AI',
  description: 'I transform complex product and business needs into scalable, accessible, and maintainable software solutions. With 8+ years of frontend experience and strong backend knowledge, I take ownership from technical definition through implementation, testing, deployment, and continuous improvement.',
  descriptionMobile: 'Senior Frontend Engineer with 8+ years of experience and strong backend knowledge. I build scalable, accessible, and maintainable solutions, taking ownership from technical definition to implementation, testing, deployment, and continuous improvement.',
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'the-four-mechanics-behind-your-llm-bill',
    title: 'The Four Mechanics Behind Your LLM Bill',
    dek: 'Why the rate card doesn\'t predict what you pay',
    excerpt: 'Four mechanics the pricing page doesn\'t describe — cache economics, quadratic context growth, tokenizer drift, and why output costs 5x more than input.',
    date: '2026-07-24',
    readTime: '9 min read',
    tags: ['LLM Pricing', 'Cost Optimization'],
    coverImage: '/blog/the-four-mechanics-behind-your-llm-bill/thumb.svg',
    content: [
      { type: 'note', text: 'All figures are illustrative estimates from a hypothetical scenario, using published Anthropic rates as of July 2026. Your numbers will differ.' },
      { type: 'paragraph', text: 'Consider a CV screener: it takes a résumé, extracts structured fields, scores the candidate against a role, and writes a short justification.' },
      { type: 'paragraph', text: 'Nothing exotic. This is what an LLM feature looks like inside any HR product.' },
      { type: 'image', id: 'img-1', caption: 'Request breakdown: 7,200 input / 1,500 output', alt: 'Stacked bar chart splitting one request into an input token segment and a smaller output token segment', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-1.svg' },
      { type: 'paragraph', text: 'At 1,000 CVs a day on Opus 4.8:' },
      { type: 'image', id: 'img-2', caption: 'Daily and monthly cost: $73.50/day → ~$2,205/month', alt: 'Bar chart projecting the per-request cost out to a daily cost and then a monthly cost', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-2.svg' },
      { type: 'paragraph', text: '$2,205 a month. That\'s the number the rate card gives you. Hold onto it.' },

      { type: 'heading', level: 2, text: '01 — Cache Break-Even' },
      { type: 'heading', level: 3, text: 'The problem' },
      { type: 'paragraph', text: 'The Claude API is stateless. Every request is independent, so you resend everything, every time.' },
      { type: 'image', id: 'img-3', caption: 'What repeats: 97% identical every call', alt: 'Bar chart highlighting that the vast majority of a request is unchanged boilerplate resent on every call', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-3.svg' },
      { type: 'paragraph', text: '97% of your input is the same text on every request. At 1,000 CVs a day that\'s $35/day for text Anthropic has already read 999 times.' },

      { type: 'heading', level: 3, text: 'The solution' },
      { type: 'paragraph', text: 'Prompt caching tells Anthropic: this prefix never changes, store it processed, reuse it next time. You mark where the stable part ends:' },
      { type: 'image', id: 'img-4', caption: 'Breakpoint: cache_control in system block', alt: 'JSON request snippet showing a cache_control marker placed right after the stable part of the system prompt, dividing it into a cached region above and an uncached region below', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-4.svg' },
      { type: 'paragraph', text: 'Everything above the breakpoint gets cached. Everything below is priced normally.' },

      { type: 'heading', level: 3, text: 'The trap' },
      { type: 'paragraph', text: 'There isn\'t one cache price. There are three.' },
      { type: 'image', id: 'img-5', caption: 'Rates on Opus 4.8: 1.0× / 1.25× / 0.1×', alt: 'Bar chart comparing three cache pricing multipliers: base rate, cache write premium, and the much lower cache read rate', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-5.svg' },
      { type: 'paragraph', text: 'Writing the cache costs more than not caching. You pay a 25% premium once to pay 90% less afterward — an investment with a payback period, not a discount.' },
      { type: 'image', id: 'img-6', caption: 'Break-even is 2 calls: 1.35 vs 2.00', alt: 'Chart comparing cumulative cost with caching against cumulative cost without caching, crossing over at the second call', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-6.svg' },
      { type: 'paragraph', text: 'Three more worth knowing:' },
      {
        type: 'list', items: [
          'The 1-hour cache costs 2.0× to write — it needs 3+ hits to pay off. At 2 calls it\'s worse than not caching.',
          'Anything variable above the breakpoint kills it. A `${new Date()}` means zero hits and a 25% surcharge on every call.',
          'The failure is silent. Check `response.usage.cache_read_input_tokens` — if it stays at 0, nothing will tell you.',
        ],
      },

      { type: 'heading', level: 3, text: 'Back to the screener' },
      { type: 'image', id: 'img-7', caption: 'Before $73.50/day → After ~$42/day', alt: 'Bar chart comparing daily cost before enabling caching to daily cost after', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-7.svg' },
      { type: 'paragraph', text: 'One line of config. 43% off the bill.' },
      { type: 'paragraph', text: 'What\'s left: output is untouched at $37.50/day — now 89% of the total. That\'s Block 04\'s problem.' },

      { type: 'heading', level: 2, text: '02 — Quadratic Resend' },
      { type: 'heading', level: 3, text: 'The problem' },
      { type: 'paragraph', text: 'Block 01 assumed one call per CV. That\'s not how agents work.' },
      { type: 'paragraph', text: 'The moment your screener uses tools — fetch the role, query the ATS, look up salary bands — you\'re in a loop. And every turn resends the entire conversation.' },
      { type: 'image', id: 'img-8', caption: 'Turn growth: A / AB / ABC / ABCD', alt: 'Diagram of four conversation turns, where each new turn resends every prior turn plus one new message, so the payload grows one block per turn', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-8.svg' },

      { type: 'heading', level: 3, text: 'The trap' },
      { type: 'paragraph', text: 'Costs don\'t grow with the conversation. They grow with the square of it.' },
      { type: 'image', id: 'img-9', caption: '10 turns = 55 units, 20 = 210, 30 = 465', alt: 'Bar chart showing cumulative resent tokens rising much faster than turn count across 10, 20, and 30 turns', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-9.svg' },
      { type: 'paragraph', text: 'Ten turns of content, 55 units on the invoice. That\'s n(n+1)/2.' },
      { type: 'paragraph', text: 'And the units aren\'t small. Tool results are the heaviest thing in an agent\'s context — a single ATS response can be 3,000 tokens of JSON, paid for on every subsequent turn.' },
      {
        type: 'list', items: [
          'Thinking tokens count too — extended thinking stays in context and gets resent at input rates.',
          'This is usually the dominant cost in agent work, not the model tier. Teams downgrade Opus to Sonnet and wonder why the bill barely moves.',
        ],
      },

      { type: 'heading', level: 3, text: 'Back to the screener' },
      { type: 'paragraph', text: 'Same base, now a 15-turn agent averaging 1,500 tokens of tool results per turn:' },
      { type: 'image', id: 'img-10', caption: 'Naive ~$127/day vs caching + pruning ~$58/day', alt: 'Bar chart comparing daily agent cost with a naive resend-everything approach against caching combined with pruning old tool results', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-10.svg' },
      { type: 'paragraph', text: 'These swing widely with how much your tool results weigh. Two things fix it: cache the stable prefix and prune tool results you\'re done with. A salary lookup from turn 3 doesn\'t need to be in context on turn 14.' },

      { type: 'heading', level: 2, text: '03 — Tokenizer Drift' },
      { type: 'heading', level: 3, text: 'The problem' },
      { type: 'paragraph', text: 'You don\'t pay per character. You pay per token — and how text splits into tokens is a property of the model, not of your text.' },

      { type: 'heading', level: 3, text: 'The trap' },
      { type: 'paragraph', text: 'Anthropic changed the tokenizer in Opus 4.7. Same text, up to 35% more tokens.' },
      { type: 'image', id: 'img-11', caption: 'Per CV: 1,000 tokens vs 1,350 tokens, +35%', alt: 'Bar chart comparing token count produced from the same CV text under the old tokenizer and the new one', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-11.svg' },
      { type: 'paragraph', text: 'The rate card says $5.00/MTok in both cases. Your bill goes up 35% anyway.' },
      { type: 'paragraph', text: 'Everyone compares models by price per million tokens. Nobody asks how many tokens the same text produces. It\'s an invisible variable that breaks every price comparison.' },
      {
        type: 'list', items: [
          'It hits Spanish, code, and proper nouns hardest — exactly where tokenizers differ most.',
          'Migrations are where it bites. You upgrade for quality and inherit a cost increase nobody mentioned in the changelog.',
        ],
      },

      { type: 'heading', level: 3, text: 'Back to the screener' },
      { type: 'paragraph', text: 'Before switching versions, run 50 real CVs through both and compare `usage.input_tokens`. Twenty minutes, and it\'s the only way to know what a migration costs.' },
      { type: 'image', id: 'img-12', caption: 'At daily scale: $36.00 → $48.60, +$12.60/day', alt: 'Bar chart comparing daily input cost at the old tokenizer rate against the new, higher tokenizer rate', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-12.svg' },
      { type: 'paragraph', text: '$380/month for changing a version string.' },

      { type: 'heading', level: 2, text: '04 — The 5× Rule' },
      { type: 'heading', level: 3, text: 'The pattern' },
      { type: 'paragraph', text: 'Across every workhorse tier, output costs exactly 5× input.' },
      { type: 'image', id: 'img-13', caption: 'Rate card: Haiku $1/$5, Sonnet $3/$15, Opus $5/$25', alt: 'Table listing input and output price per million tokens for Haiku, Sonnet, and Opus, with output marked as 5 times input on every row', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-13.svg' },
      { type: 'paragraph', text: 'Know your input price, multiply by five. That\'s the whole rule.' },

      { type: 'heading', level: 3, text: 'The trap' },
      { type: 'image', id: 'img-14', caption: 'Same screener, two sides of the bill', alt: 'Two ring gauges side by side: output is 17% of tokens but 51% of cost', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-14.svg' },
      { type: 'paragraph', text: 'Output is 17% of your tokens and 51% of your bill.' },
      { type: 'paragraph', text: 'This inverts where you optimize. Everyone trims the prompt. But cutting 100K input tokens saves $0.50 — cutting 100K output tokens saves $2.50. Output optimization pays 5× more.' },
      {
        type: 'list', items: [
          'Thinking tokens bill as output. Extended thinking without a budget generates thousands of tokens at the most expensive rate on the card.',
          '`max_tokens` is a cap, not a target — but a verbose prompt will fill it. "Write a brief justification" versus "write a thorough analysis" is a real line item.',
        ],
      },

      { type: 'heading', level: 3, text: 'Back to the screener' },
      { type: 'paragraph', text: 'Ask for structured output instead of prose — a score, five fields, two sentences:' },
      { type: 'image', id: 'img-15', caption: '1,500 tokens $37.50/day → 600 tokens $15.00/day', alt: 'Bar chart comparing daily output cost between verbose prose output and constrained structured output', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-15.svg' },
      { type: 'paragraph', text: '$675/month for a tighter output spec.' },

      { type: 'heading', level: 2, text: 'Where the bill actually landed' },
      { type: 'image', id: 'img-16', caption: '$2,205 → $1,261 → $586, 73% lower', alt: 'Bar chart of monthly cost dropping in three steps from the original bill down through intermediate optimizations to the final 73% lower bill', src: '/blog/the-four-mechanics-behind-your-llm-bill/img-16.svg' },
      { type: 'paragraph', text: 'That\'s a 73% reduction in this scenario, and the model never changed. No downgrade, no quality tradeoff — just four mechanics the pricing page doesn\'t describe.' },
      { type: 'paragraph', text: 'The order matters, and it\'s the answer to "how do you optimize LLM costs" in an interview:' },
      {
        type: 'list', ordered: true, items: [
          'Pick the cheapest model that clears the quality bar — Haiku is 5× cheaper than Sonnet, 25× cheaper than Opus',
          'Constrain output — pays 5× more than trimming input',
          'Manage context — the dominant cost in agent loops',
          'Cache the stable prefix — 90% off what repeats',
          'Measure real tokens when you migrate — the rate card doesn\'t tell you',
        ],
      },
      { type: 'paragraph', text: 'Four mechanics: when to cache, how much context you\'re dragging, how many tokens your text actually becomes, and which side of the bill you\'re on.' },

      { type: 'heading', level: 2, text: 'A note on the numbers' },
      { type: 'note', text: 'Everything here is a worked example, not a benchmark. The screener is hypothetical, the token counts are round numbers chosen to make the arithmetic legible, and the savings are what the arithmetic implies — not measured results from production.' },
      { type: 'note', text: 'Rates are Anthropic\'s published prices as of July 2026 and will change. Cache multipliers, tokenizer behaviour, and model pricing are documented by Anthropic and are the source of truth over anything here.' },
      { type: 'note', text: 'The point isn\'t the dollar figures. It\'s the four mechanics, which hold regardless of what the rate card says on the day you read this.' },
    ],
  },
];

export const skills: Skill[] = [
  {
    category: 'Frontend Engineering',
    items: ['TypeScript', 'JavaScript', 'React', 'Next.js', 'Angular', 'Web Components', 'HTML', 'CSS', 'Sass', 'Storybook'],
  },
  {
    category: 'Frontend Architecture & Design Systems',
    items: ['Design Systems', 'Component APIs', 'Design Tokens', 'Component Libraries', 'Micro Frontends', 'Accessibility (WCAG)', 'Responsive Design', 'Performance Optimization', 'Adobe Experience Manager (AEM)'],
  },
  {
    category: 'Backend & Integrations',
    items: ['Node.js / Express', 'REST APIs', 'GraphQL'],
  },
  {
    category: 'Testing & Delivery',
    items: ['Vitest', 'Jest', 'Cypress', 'Unit & Regression Testing', 'Test Automation', 'CI/CD', 'Code Reviews', 'Azure'],
  },
  {
    category: 'AI Engineering',
    items: ['Claude API', 'Structured Outputs', 'Tool Use', 'Retrieval', 'Evaluation', 'Prompt Engineering', 'OpenAI & Anthropic API', 'Cursor / Copilot / Claude', 'AI-assisted Development', 'n8n / Make / Zapier', 'GitHub Actions', 'Node.js Scripting'],
  },
  {
    category: 'Data',
    items: ['PostgreSQL', 'MongoDB', 'SQL'],
  },
  {
    category: 'Tooling & Workflow',
    items: ['Git', 'Figma', 'Agile/Scrum', 'Jira', 'Google Analytics'],
  },
];
