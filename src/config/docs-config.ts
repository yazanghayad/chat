// Auto-generated JSON data importeras här.
// Scriptet skriver BARA till docs-data.json – aldrig till denna fil.

export interface DocsSection {
  id: string;
  title: string;
  content: string; // HTML (renderas via dangerouslySetInnerHTML)
}

export interface DocsArticle {
  slug: string;
  title: string;
  description: string;
  sections: DocsSection[];
}

export interface DocsCategory {
  slug: string;
  title: string;
  icon: string;
  description: string;
  articles: DocsArticle[];
}

let docsData: DocsCategory[] = [];
try {
  const data = require('./docs-data.json');
  docsData = data as DocsCategory[];
} catch (e) {
  console.warn('docs-data.json not found, using empty array');
}

export const docsCategories: DocsCategory[] = docsData;

export function findArticle(categorySlug: string, articleSlug: string) {
  const cat = docsCategories.find((c) => c.slug === categorySlug);
  if (!cat) return null;
  const article = cat.articles.find((a) => a.slug === articleSlug);
  if (!article) return null;
  return { category: cat, article };
}

export function getAllArticlePaths() {
  return docsCategories.flatMap((cat) =>
    cat.articles.map((a) => ({ category: cat.slug, slug: a.slug }))
  );
}

export function getAdjacentArticles(categorySlug: string, articleSlug: string) {
  const all = docsCategories.flatMap((cat) =>
    cat.articles.map((a) => ({ category: cat, article: a }))
  );
  const idx = all.findIndex(
    (x) => x.category.slug === categorySlug && x.article.slug === articleSlug
  );
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null
  };
}
