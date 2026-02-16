'use client';

import React from 'react';
import { SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import { Breadcrumbs } from '../breadcrumbs';
import { UserNav } from './user-nav';
import { ThemeSelector } from '../themes/theme-selector';
import { ThemeModeToggle } from '../themes/theme-mode-toggle';
import { FileText, Headset } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { useChatbotStore } from '@/features/chatbot/store';

export default function Header() {
  const openChat = useChatbotStore((s) => s.setOpen);

  return (
    <header className='flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
      <div className='flex items-center gap-2 px-4'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4' />
        <Breadcrumbs />
      </div>

      <div className='flex items-center gap-2 px-4'>
        <Button
          variant='ghost'
          size='sm'
          className='hidden gap-1.5 text-xs md:flex'
          asChild
        >
          <Link href='/dashboard/docs'>
            <FileText className='h-3.5 w-3.5' />
            Docs
          </Link>
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='hidden gap-1.5 text-xs md:flex'
          onClick={() => openChat(true)}
        >
          <Headset className='h-3.5 w-3.5' />
          Talk to a product specialist
        </Button>
        <UserNav />
        <ThemeModeToggle />
        <ThemeSelector />
      </div>
    </header>
  );
}
