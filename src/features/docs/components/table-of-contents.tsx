'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import type { DocsSection } from '@/config/docs-config';

interface Props {
  sections: DocsSection[];
}

export function TableOfContents({ sections }: Props) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );

    const headings = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;

  return (
    <aside className='sticky top-12 hidden h-[calc(100vh-3rem)] w-48 shrink-0 xl:block'>
      <div className='py-8 pl-4'>
        <p className='text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase'>
          I den här artikeln
        </p>
        <nav className='space-y-0.5'>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={cn(
                'text-muted-foreground hover:text-foreground block border-l border-transparent py-1 pl-3 text-[13px] leading-snug transition-colors',
                activeId === s.id && 'border-foreground text-foreground'
              )}
            >
              {s.title}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
