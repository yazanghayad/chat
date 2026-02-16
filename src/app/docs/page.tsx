import Link from 'next/link';
import { docsCategories } from '@/config/docs-config';
import { Icons } from '@/components/icons';
import { IconArrowRight } from '@tabler/icons-react';

export default function DocsPage() {
  return (
    <main>
      {/* Hero — clean, text-only */}
      <section className='border-b'>
        <div className='mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8'>
          <h1 className='text-foreground text-2xl font-semibold tracking-tight sm:text-3xl'>
            Dokumentation
          </h1>
          <p className='text-muted-foreground mt-2 max-w-xl text-[15px] leading-relaxed'>
            Lär dig hur du konfigurerar, tränar och hanterar din AI-agent i
            SWEO&nbsp;AI.
          </p>
        </div>
      </section>

      {/* Category grid */}
      <section className='mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8'>
        <div className='grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-3'>
          {docsCategories.map((cat) => {
            const IconComponent =
              Icons[cat.icon as keyof typeof Icons] ?? Icons.knowledge;
            return (
              <div key={cat.slug} className='bg-card flex flex-col p-5'>
                <div className='text-muted-foreground mb-3'>
                  <IconComponent className='h-5 w-5' />
                </div>
                <h2 className='text-foreground text-sm font-medium'>
                  {cat.title}
                </h2>
                <p className='text-muted-foreground mt-1 text-[13px] leading-snug'>
                  {cat.description}
                </p>
                <ul className='mt-3 space-y-1'>
                  {cat.articles.map((article) => (
                    <li key={article.slug}>
                      <Link
                        href={`/docs/${cat.slug}/${article.slug}`}
                        className='text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-[13px] transition-colors'
                      >
                        <IconArrowRight className='h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100' />
                        <span className='group-hover:underline'>
                          {article.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t'>
        <div className='text-muted-foreground mx-auto max-w-7xl px-4 py-6 text-[13px] sm:px-6 lg:px-8'>
          &copy; {new Date().getFullYear()} SWEO AI
        </div>
      </footer>
    </main>
  );
}
