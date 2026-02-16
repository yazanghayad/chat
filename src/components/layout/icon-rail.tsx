'use client';

import { cn } from '@/lib/utils';
import {
  BarChart3,
  BookOpen,
  LayoutGrid,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface RailItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  matchPrefix: string;
}

const topItems: RailItem[] = [
  {
    icon: LayoutGrid,
    label: 'Overview',
    href: '/dashboard/overview',
    matchPrefix: '/dashboard/overview'
  },
  {
    icon: Sparkles,
    label: 'AI & Automation',
    href: '/dashboard/ai',
    matchPrefix: '/dashboard/ai'
  },
  {
    icon: MessageSquare,
    label: 'Inbox',
    href: '/dashboard/inbox',
    matchPrefix: '/dashboard/inbox'
  },
  {
    icon: BarChart3,
    label: 'Reports',
    href: '/dashboard/reports',
    matchPrefix: '/dashboard/reports'
  },
  {
    icon: BookOpen,
    label: 'Knowledge',
    href: '/dashboard/knowledge',
    matchPrefix: '/dashboard/knowledge'
  },
  {
    icon: Users,
    label: 'Contacts',
    href: '/dashboard/contacts',
    matchPrefix: '/dashboard/contacts'
  }
];

const bottomItems: RailItem[] = [
  {
    icon: Settings,
    label: 'Settings',
    href: '/dashboard/settings',
    matchPrefix: '/dashboard/settings'
  }
];

function RailButton({ item, isActive }: { item: RailItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {isActive && (
            <span className='bg-primary absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full' />
          )}
          <Icon className='h-5 w-5' />
        </Link>
      </TooltipTrigger>
      <TooltipContent side='right' sideOffset={8}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function IconRail() {
  const pathname = usePathname();

  const isActive = (item: RailItem) => pathname.startsWith(item.matchPrefix);

  return (
    <TooltipProvider delayDuration={0}>
      <aside className='bg-sidebar border-sidebar-border flex h-screen w-14 flex-col items-center border-r py-3'>
        {/* Top section — main nav */}
        <nav className='flex flex-1 flex-col items-center gap-1'>
          {topItems.map((item) => (
            <RailButton key={item.href} item={item} isActive={isActive(item)} />
          ))}
        </nav>

        {/* Bottom section — search, settings, profile */}
        <nav className='flex flex-col items-center gap-1'>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className='text-muted-foreground hover:bg-accent hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-lg transition-colors'
                onClick={() => {
                  // Trigger Cmd+K
                  document.dispatchEvent(
                    new KeyboardEvent('keydown', {
                      key: 'k',
                      metaKey: true,
                      bubbles: true
                    })
                  );
                }}
              >
                <Search className='h-5 w-5' />
              </button>
            </TooltipTrigger>
            <TooltipContent side='right' sideOffset={8}>
              Search (⌘K)
            </TooltipContent>
          </Tooltip>

          {bottomItems.map((item) => (
            <RailButton key={item.href} item={item} isActive={isActive(item)} />
          ))}

          <div className='mt-1'>
            <Avatar className='h-8 w-8'>
              <AvatarFallback className='bg-primary/20 text-primary text-xs'>
                U
              </AvatarFallback>
            </Avatar>
          </div>
        </nav>
      </aside>
    </TooltipProvider>
  );
}
