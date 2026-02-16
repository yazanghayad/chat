'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { docsCategories } from '@/config/docs-config';
import { IconChevronDown } from '@tabler/icons-react';
import { useState } from 'react';

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className='sticky top-12 hidden h-[calc(100vh-3rem)] w-56 shrink-0 lg:block'>
      <ScrollArea className='h-full py-6 pr-6'>
        <nav className='space-y-4'>
          {docsCategories.map((cat) => (
            <SidebarCategory
              key={cat.slug}
              category={cat}
              pathname={pathname}
            />
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}

function SidebarCategory({
  category,
  pathname
}: {
  category: (typeof docsCategories)[number];
  pathname: string;
}) {
  const isActive = pathname.includes(`/docs/${category.slug}/`);
  const [open, setOpen] = useState(isActive);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className='flex w-full items-center justify-between py-1 text-[13px] font-medium'
      >
        <span className='text-foreground'>{category.title}</span>
        <IconChevronDown
          className={cn(
            'text-muted-foreground h-3.5 w-3.5 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <ul className='mt-1 space-y-px border-l'>
          {category.articles.map((article) => {
            const href = `/docs/${category.slug}/${article.slug}`;
            const active = pathname === href;
            return (
              <li key={article.slug}>
                <Link
                  href={href}
                  className={cn(
                    'text-muted-foreground hover:text-foreground -ml-px block border-l border-transparent py-1 pl-3 text-[13px] transition-colors',
                    active && 'border-foreground text-foreground'
                  )}
                >
                  {article.title}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
