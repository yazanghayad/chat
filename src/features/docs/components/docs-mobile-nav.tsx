'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { docsCategories } from '@/config/docs-config';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconMenu2, IconChevronDown } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function DocsMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // find current category title for context
  const activeCat = docsCategories.find((c) =>
    pathname.includes(`/docs/${c.slug}/`)
  );

  return (
    <div className='bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-12 z-40 border-b backdrop-blur lg:hidden'>
      <div className='flex items-center px-4 py-1.5'>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className='h-7 gap-1.5 px-2 text-[13px]'
            >
              <IconMenu2 className='h-4 w-4' />
              {activeCat?.title ?? 'Meny'}
            </Button>
          </SheetTrigger>
          <SheetContent side='left' className='w-64 p-0'>
            <ScrollArea className='h-full px-4 pt-10 pb-6'>
              <nav className='space-y-4'>
                {docsCategories.map((cat) => {
                  const isActive = pathname.includes(`/docs/${cat.slug}/`);
                  return (
                    <MobileCategory
                      key={cat.slug}
                      category={cat}
                      pathname={pathname}
                      defaultOpen={isActive}
                      onNavigate={() => setOpen(false)}
                    />
                  );
                })}
              </nav>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function MobileCategory({
  category,
  pathname,
  defaultOpen,
  onNavigate
}: {
  category: (typeof docsCategories)[number];
  pathname: string;
  defaultOpen: boolean;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

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
                  onClick={onNavigate}
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
