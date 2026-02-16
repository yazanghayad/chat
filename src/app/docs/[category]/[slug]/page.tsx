import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  findArticle,
  getAdjacentArticles,
  getAllArticlePaths
} from '@/config/docs-config';
import { DocsSidebar, TableOfContents, DocsMobileNav } from '@/features/docs';
import {
  IconChevronRight,
  IconArrowLeft,
  IconArrowRight
} from '@tabler/icons-react';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return getAllArticlePaths();
}

type PageProps = {
  params: Promise<{ category: string; slug: string }>;
};

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const result = findArticle(category, slug);
  if (!result) return {};
  return {
    title: `${result.article.title} – SWEO AI Docs`,
    description: result.article.description
  };
}

export default async function DocsArticlePage({ params }: PageProps) {
  const { category, slug } = await params;
  const result = findArticle(category, slug);
  if (!result) notFound();

  const { category: cat, article } = result;
  const { prev, next } = getAdjacentArticles(category, slug);

  return (
    <>
      <DocsMobileNav />

      <div className='mx-auto flex max-w-7xl px-4 sm:px-6 lg:px-8'>
        <DocsSidebar />

        <article className='min-w-0 flex-1 py-8 lg:px-10'>
          {/* Breadcrumb */}
          <nav className='text-muted-foreground mb-6 flex items-center gap-1 text-[13px]'>
            <Link
              href='/docs'
              className='hover:text-foreground transition-colors'
            >
              Docs
            </Link>
            <IconChevronRight className='h-3 w-3' />
            <span className='text-foreground'>{cat.title}</span>
          </nav>

          <h1 className='text-foreground text-2xl font-semibold tracking-tight'>
            {article.title}
          </h1>
          <p className='text-muted-foreground mt-1.5 text-[15px] leading-relaxed'>
            {article.description}
          </p>

          <hr className='border-border my-8' />

          {/* Sections */}
          {article.sections.map((section) => (
            <section key={section.id} id={section.id} className='scroll-mt-16'>
              <h2 className='text-foreground mt-10 mb-3 text-lg font-medium'>
                {section.title}
              </h2>
              <div
                className='text-foreground/85 [&_a]:text-primary [&_code]:bg-muted [&_pre]:bg-muted [&_strong]:text-foreground text-[15px] leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px] [&_h4]:mt-5 [&_h4]:mb-1.5 [&_h4]:text-[15px] [&_h4]:font-medium [&_li]:mb-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2.5 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:text-[13px] [&_strong]:font-medium [&_table]:my-3 [&_table]:w-full [&_table]:text-[14px] [&_td]:border-b [&_td]:px-3 [&_td]:py-2 [&_th]:border-b [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5'
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </section>
          ))}

          <hr className='border-border my-10' />

          {/* Prev / Next */}
          <nav className='grid grid-cols-2 gap-4'>
            {prev ? (
              <Link
                href={`/docs/${prev.category.slug}/${prev.article.slug}`}
                className='group hover:bg-muted/50 flex flex-col gap-0.5 rounded-md border p-3 transition-colors'
              >
                <span className='text-muted-foreground flex items-center gap-1 text-[11px]'>
                  <IconArrowLeft className='h-3 w-3' />
                  Föregående
                </span>
                <span className='text-foreground text-[13px] font-medium'>
                  {prev.article.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/docs/${next.category.slug}/${next.article.slug}`}
                className='group hover:bg-muted/50 flex flex-col items-end gap-0.5 rounded-md border p-3 text-right transition-colors'
              >
                <span className='text-muted-foreground flex items-center gap-1 text-[11px]'>
                  Nästa
                  <IconArrowRight className='h-3 w-3' />
                </span>
                <span className='text-foreground text-[13px] font-medium'>
                  {next.article.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </nav>
        </article>

        <TableOfContents sections={article.sections} />
      </div>
    </>
  );
}
