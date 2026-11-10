// News articles are StudioCMS pages. Editors write them in the StudioCMS dashboard;
// this module reads them through the StudioCMS SDK and shapes them for the React site.
//
// NOTE: the SDK returns empty category/tag arrays on page objects (StudioCMS 0.7.0), so the
// numeric ids are read straight from the page table (same data the dashboard writes) and
// resolved against the SDK's category/tag lists.
import { runSDK, SDKCoreJs } from 'studiocms:sdk';
import { all } from './db.js';

const parseIds = (v) => { try { return JSON.parse(v ?? '[]'); } catch { return []; } };

async function lookups() {
  const [cats, tags, rows] = await Promise.all([
    runSDK(SDKCoreJs.GET.categories.getAll()),
    runSDK(SDKCoreJs.GET.tags.getAll()),
    all('SELECT id, categories, tags FROM StudioCMSPageData'),
  ]);
  const catById = new Map(cats.map((c) => [Number(c.id), c.name]));
  const tagById = new Map(tags.map((t) => [Number(t.id), t.name]));
  const byPage = new Map(rows.map((r) => [r.id, {
    categories: parseIds(r.categories).map((i) => catById.get(Number(i))).filter(Boolean),
    tags: parseIds(r.tags).map((i) => tagById.get(Number(i))).filter(Boolean),
  }]));
  return { byPage, categoryNames: [...catById.values()] };
}

const words = (s) => (s.match(/\S+/g) || []).length;

function shape(page, meta, withContent) {
  const content = page.defaultContent?.content ?? '';
  const category = meta?.categories?.[0] ?? 'News';
  const a = {
    slug: page.slug,
    title: page.title,
    dek: page.description,
    category,
    kicker: category.toUpperCase(),
    tags: meta?.tags ?? [],
    author: page.showAuthor === false ? null : (page.authorData?.name ?? null),
    heroImage: page.heroImage ?? null,
    publishedAt: page.publishedAt ?? page.updatedAt,
    updatedAt: page.updatedAt,
    readMinutes: Math.max(1, Math.round(words(content) / 220)),
  };
  if (withContent) a.content = content;
  return a;
}

const byDate = (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt);
const isLive = (p) => !p.draft && p.package === 'studiocms' && (!p.publishedAt || new Date(p.publishedAt) <= new Date());

export async function listArticles({ category, limit = 50, exclude } = {}) {
  const [pages, { byPage, categoryNames }] = await Promise.all([runSDK(SDKCoreJs.GET.pages()), lookups()]);
  let list = pages.filter(isLive).map((p) => shape(p, byPage.get(p.id), false)).sort(byDate);
  if (category && category.toLowerCase() !== 'all') list = list.filter((a) => a.category.toLowerCase() === category.toLowerCase());
  if (exclude) list = list.filter((a) => a.slug !== exclude);
  return { articles: list.slice(0, limit), categories: categoryNames };
}

export async function getArticle(slug) {
  const [page, { byPage }] = await Promise.all([runSDK(SDKCoreJs.GET.page.bySlug(slug)), lookups()]);
  if (!page || !isLive(page)) return null;
  return shape(page, byPage.get(page.id), true);
}

export async function homeFeed() {
  const { articles, categories } = await listArticles({ limit: 200 });
  const [lead, ...rest] = articles;
  const sections = ['Local', 'World', 'Business', 'Entertainment']
    .filter((n) => categories.includes(n))
    .map((name) => {
      const items = articles.filter((a) => a.category === name);
      return { name, lead: items[0] ?? null, links: items.slice(1, 3) };
    });
  return { lead: lead ?? null, secondary: rest.slice(0, 3), latest: articles.slice(0, 6), sections };
}
