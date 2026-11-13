import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeStringify from 'rehype-stringify';
import type { Root as MdastRoot } from 'mdast';
import type { Root as HastRoot, Element, ElementContent, RootContent, Text } from 'hast';

/**
 * AI Developer's Handbook — content loader.
 *
 * Content lives flat in `content/docs` as Markdown files:
 *  - `index.md` is the landing page (/handbook).
 *  - A numeric prefix (`01-llm-applications.md`) is the chapter number and
 *    sets the order; it is stripped from the URL (/handbook/llm-applications).
 *  - The `part` frontmatter field places the page in a sidebar group. Groups
 *    are declared, in order, in `content/docs/_meta.json`.
 *  - Frontmatter: `title`, `part`, `level`, `reading_time`, `reviewed`,
 *    `description`, `sidebarTitle` (all optional). Without a `title`, the first
 *    `# Heading` is used. A leading `# Heading` is always removed from the body
 *    because the page renders its own title.
 *  - "Chapter 13" / "Chapters 8 and 13" in the text become links automatically.
 *  - Local-only content (visible with `npm run dev`, excluded from production
 *    builds): a group with `"localOnly": true` in `_meta.json`, a page with
 *    `draft: true`, or a block wrapped in `<!-- local-only -->…<!-- /local-only -->`.
 */

export const DOCS_DIR = path.join(process.cwd(), 'content', 'docs');
export const HANDBOOK_BASE = '/handbook';
export const HANDBOOK_TITLE = "AI Developer's Handbook";

/** Local-only content is shown in development and dropped from production builds. */
const SHOW_LOCAL_ONLY = process.env.NODE_ENV !== 'production';
const LOCAL_ONLY_BLOCK = /<!--\s*local-only\s*-->[\s\S]*?<!--\s*\/local-only\s*-->/g;

export type NavPage = { type: 'page'; title: string; href: string; number?: number; localOnly?: boolean };
export type NavGroup = {
  type: 'group';
  label?: string;
  title: string;
  children: NavPage[];
  localOnly?: boolean;
};
export type NavNode = NavPage | NavGroup;

export interface TocHeading {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface DocLink {
  title: string;
  href: string;
}

export interface Doc {
  slug: string[];
  href: string;
  title: string;
  description?: string;
  number?: number;
  group?: { label?: string; title: string };
  meta: string[];
  html: string;
  headings: TocHeading[];
  prev?: DocLink;
  next?: DocLink;
}

interface DocEntry {
  slug: string[];
  href: string;
  file: string;
  title: string;
  sidebarTitle?: string;
  description?: string;
  number?: number;
  part?: string;
  localOnly?: boolean;
  meta: string[];
  group?: { label?: string; title: string };
}

interface GroupConfig {
  label?: string;
  title: string;
  parts: string[];
  localOnly?: boolean;
}

interface DocsIndex {
  nav: NavNode[];
  entries: DocEntry[];
  chapters: Map<number, string>;
}

/* ── Frontmatter ───────────────────────────────────────────── */

const ORDER_PREFIX = /^(\d+)[-_]/;

const humanize = (name: string) =>
  name
    .replace(ORDER_PREFIX, '')
    .replace(/\.mdx?$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

const fileToSlug = (name: string): string[] => {
  const base = name.replace(/\.mdx?$/, '').replace(ORDER_PREFIX, '');
  return base === 'index' ? [] : [base];
};

const slugToHref = (slug: string[]) =>
  slug.length ? `${HANDBOOK_BASE}/${slug.join('/')}` : HANDBOOK_BASE;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-11` → `Nov 2026` */
const formatReviewed = (value: unknown) => {
  const m = String(value).match(/^(\d{4})-(\d{1,2})/);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : String(value);
};

/** `intermediate-advanced` → `Intermediate to advanced` */
const formatLevel = (value: unknown) =>
  String(value)
    .split('-')
    .join(' to ')
    .replace(/^\w/, (c) => c.toUpperCase());

/** Plain text of the first paragraph (used as the meta description). */
const firstParagraph = (content: string) => {
  const block = content
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .find((b) => b && !/^(#|```|>|\||-|\*|\d+\.)/.test(b));
  return block
    ?.replace(/\s+/g, ' ')
    .replace(/[`*_]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
};

const readEntry = (name: string): DocEntry => {
  const file = path.join(DOCS_DIR, name);
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const slug = fileToSlug(name);
  const prefix = name.match(ORDER_PREFIX);
  const h1 = content.match(/^#\s+(.+)$/m)?.[1]?.trim().replace(/^\d+\.\s+/, '');

  const meta: string[] = [];
  if (data.level) meta.push(formatLevel(data.level));
  if (data.reading_time) meta.push(`${String(data.reading_time).replace(/\s*read$/, '')} read`);
  if (data.reviewed) meta.push(`Reviewed ${formatReviewed(data.reviewed)}`);

  return {
    slug,
    href: slugToHref(slug),
    file,
    title: data.title ?? h1 ?? (slug.length ? humanize(name) : HANDBOOK_TITLE),
    sidebarTitle: data.sidebarTitle,
    description: data.description ?? firstParagraph(content),
    number: prefix ? Number(prefix[1]) : undefined,
    part: data.part !== undefined ? String(data.part) : undefined,
    localOnly: data.draft === true,
    meta,
  };
};

/* ── Index (sidebar tree + ordered list of pages) ──────────── */

const readGroups = (): GroupConfig[] => {
  const metaFile = path.join(DOCS_DIR, '_meta.json');
  if (!fs.existsSync(metaFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(metaFile, 'utf8')).groups ?? [];
  } catch {
    return [];
  }
};

const byOrder = (a: DocEntry, b: DocEntry) =>
  (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER) ||
  a.file.localeCompare(b.file);

const toNavPage = (e: DocEntry): NavPage => ({
  type: 'page',
  title: e.sidebarTitle ?? (e.slug.length ? e.title : 'Overview'),
  href: e.href,
  number: e.number,
  localOnly: e.localOnly || undefined,
});

const buildIndex = (): DocsIndex => {
  if (!fs.existsSync(DOCS_DIR)) return { nav: [], entries: [], chapters: new Map() };

  const groups = readGroups().map((g) => ({ ...g, items: [] as DocEntry[] }));
  const groupOf = (e: DocEntry) => (e.part ? groups.find((g) => g.parts.includes(e.part!)) : undefined);

  const all = fs
    .readdirSync(DOCS_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && /\.mdx?$/.test(d.name) && !/^[_.]/.test(d.name))
    .map((d) => readEntry(d.name))
    .map((e) => ({ ...e, localOnly: e.localOnly || groupOf(e)?.localOnly }))
    .filter((e) => SHOW_LOCAL_ONLY || !e.localOnly)
    .sort(byOrder);

  const nav: NavNode[] = [];
  const ungrouped: DocEntry[] = [];
  const extraGroups = new Map<string, DocEntry[]>();

  for (const entry of all) {
    if (!entry.slug.length) {
      nav.push(toNavPage(entry));
      continue;
    }
    const group = groupOf(entry);
    if (group) {
      group.items.push(entry);
      entry.group = { label: group.label, title: group.title };
    } else if (entry.part) {
      // A part missing from _meta.json still gets its own group.
      extraGroups.set(entry.part, [...(extraGroups.get(entry.part) ?? []), entry]);
      entry.group = { label: `Part ${entry.part}`, title: `Part ${entry.part}` };
    } else {
      ungrouped.push(entry);
    }
  }

  nav.push(...ungrouped.map(toNavPage));
  for (const g of groups) {
    if (g.items.length) {
      nav.push({
        type: 'group',
        label: g.label,
        title: g.title,
        children: g.items.map(toNavPage),
        localOnly: g.localOnly || undefined,
      });
    }
  }
  for (const [part, items] of extraGroups) {
    nav.push({ type: 'group', title: `Part ${part}`, children: items.map(toNavPage) });
  }

  // Reading order follows the sidebar.
  const order = nav.flatMap((n) => (n.type === 'page' ? [n.href] : n.children.map((c) => c.href)));
  const entries = [...all].sort((a, b) => order.indexOf(a.href) - order.indexOf(b.href));

  const chapters = new Map<number, string>();
  for (const e of entries) if (e.number !== undefined) chapters.set(e.number, e.href);

  return { nav, entries, chapters };
};

let cachedIndex: DocsIndex | undefined;

const getIndex = (): DocsIndex => {
  if (cachedIndex && process.env.NODE_ENV === 'production') return cachedIndex;
  cachedIndex = buildIndex();
  return cachedIndex;
};

export const getDocsNav = (): NavNode[] => getIndex().nav;

export const getAllDocSlugs = (): string[][] => getIndex().entries.map((e) => e.slug);

export const getDocEntry = (slug: string[]) =>
  getIndex().entries.find((e) => e.slug.join('/') === slug.join('/'));

/* ── Markdown → HTML plugins ───────────────────────────────── */

type DocFileData = { headings?: TocHeading[] };

/** Removes the leading `# Title` (the page renders its own title). */
const remarkStripTitle = () => (tree: MdastRoot) => {
  const first = tree.children[0];
  if (first?.type === 'heading' && first.depth === 1) tree.children.shift();
};

const hastText = (node: ElementContent | RootContent): string => {
  if (node.type === 'text') return node.value;
  if ('children' in node) return (node.children as ElementContent[]).map(hastText).join('');
  return '';
};

const walk = (node: HastRoot | Element, visit: (el: Element) => void) => {
  for (const child of node.children) {
    if (child.type === 'element') {
      visit(child);
      walk(child, visit);
    }
  }
};

/** Collects h2/h3 for the "On this page" column (runs after rehype-slug). */
const rehypeCollectHeadings = () => (tree: HastRoot, file: { data: unknown }) => {
  const headings: TocHeading[] = [];
  walk(tree, (el) => {
    if ((el.tagName === 'h2' || el.tagName === 'h3') && el.properties?.id) {
      headings.push({
        id: String(el.properties.id),
        text: hastText(el),
        depth: el.tagName === 'h2' ? 2 : 3,
      });
    }
  });
  (file.data as DocFileData).headings = headings;
};

/** Relative `.md` links → handbook routes; external links open in a new tab. */
const rehypeLinks = () => (tree: HastRoot) => {
  walk(tree, (el) => {
    if (el.tagName !== 'a') return;
    const href = el.properties?.href;
    if (typeof href !== 'string') return;

    if (/^https?:\/\//.test(href)) {
      el.properties.target = '_blank';
      el.properties.rel = ['noopener', 'noreferrer'];
      return;
    }

    const m = href.match(/^(?:\.\/)?([^/#?]+\.mdx?)(#.*)?$/);
    if (m) el.properties.href = slugToHref(fileToSlug(m[1])) + (m[2] ?? '');
  });
};

const SKIP_TAGS = new Set(['a', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const CHAPTER_REF = /\bChapters?\s+\d+(?:(?:\s*[–-]\s*|,\s*(?:and\s+)?|\s+and\s+)\d+)*/g;

/** Turns "Chapter 13" and "Chapters 8 and 13" in prose into links. */
const rehypeChapterLinks = (options: { chapters: Map<number, string>; current?: number }) => {
  const link = (n: number, text: string): ElementContent | Text => {
    const href = options.chapters.get(n);
    if (!href || n === options.current) return { type: 'text', value: text };
    return { type: 'element', tagName: 'a', properties: { href }, children: [{ type: 'text', value: text }] };
  };

  const splitText = (value: string): (ElementContent | Text)[] | undefined => {
    const out: (ElementContent | Text)[] = [];
    let last = 0;
    for (const match of value.matchAll(CHAPTER_REF)) {
      const start = match.index ?? 0;
      if (start > last) out.push({ type: 'text', value: value.slice(last, start) });
      const ref = match[0];
      if (ref.startsWith('Chapters')) {
        // Link each number on its own: "Chapters [8] and [13]".
        let i = 0;
        for (const num of ref.matchAll(/\d+/g)) {
          const at = num.index ?? 0;
          if (at > i) out.push({ type: 'text', value: ref.slice(i, at) });
          out.push(link(Number(num[0]), num[0]));
          i = at + num[0].length;
        }
        if (i < ref.length) out.push({ type: 'text', value: ref.slice(i) });
      } else {
        out.push(link(Number(ref.match(/\d+/)![0]), ref));
      }
      last = start + ref.length;
    }
    if (!out.length) return undefined;
    if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
    return out;
  };

  const visit = (node: HastRoot | Element) => {
    const children: RootContent[] = [];
    for (const child of node.children as RootContent[]) {
      if (child.type === 'text') {
        children.push(...(splitText(child.value) ?? [child]));
        continue;
      }
      if (child.type === 'element' && !SKIP_TAGS.has(child.tagName)) visit(child);
      children.push(child);
    }
    node.children = children as typeof node.children;
  };

  return (tree: HastRoot) => visit(tree);
};

/* ── Public: render one page ───────────────────────────────── */

export const getDoc = async (slug: string[]): Promise<Doc | undefined> => {
  const { entries, chapters } = getIndex();
  const idx = entries.findIndex((e) => e.slug.join('/') === slug.join('/'));
  if (idx === -1) return undefined;
  const entry = entries[idx];

  const { content: raw } = matter(fs.readFileSync(entry.file, 'utf8'));
  const content = SHOW_LOCAL_ONLY ? raw : raw.replace(LOCAL_ONLY_BLOCK, '');
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStripTitle)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeLinks)
    .use(rehypeChapterLinks, { chapters, current: entry.number })
    .use(rehypeCollectHeadings)
    .use(rehypePrettyCode, { theme: 'github-dark-dimmed', keepBackground: false })
    .use(rehypeStringify)
    .process(content);

  // Public pages never point to local-only ones, so prev/next match production.
  // Local-only pages keep the full sequence so they can be browsed in dev.
  const sequence = entry.localOnly ? entries : entries.filter((e) => !e.localOnly);
  const pos = sequence.indexOf(entry);
  const prev = sequence[pos - 1];
  const next = sequence[pos + 1];
  const label = (e: DocEntry) => (e.number !== undefined ? `${e.number}. ${e.title}` : e.title);

  return {
    slug: entry.slug,
    href: entry.href,
    title: entry.title,
    description: entry.description,
    number: entry.number,
    group: entry.group,
    meta: entry.meta,
    html: String(file),
    headings: (file.data as DocFileData).headings ?? [],
    prev: prev && { title: label(prev), href: prev.href },
    next: next && { title: label(next), href: next.href },
  };
};
