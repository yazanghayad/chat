'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Hash,
  Inbox,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  ArrowUpRight,
  AtSign,
  Edit3,
  Layers,
  Search,
  ShieldAlert,
  Star,
  Ticket,
  Users
} from 'lucide-react';
import type { InboxView } from './inbox-page-client';

interface SidebarItem {
  id: InboxView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

const mainItems: SidebarItem[] = [
  { id: 'your-inbox', label: 'Your inbox', icon: Inbox, count: 4 },
  { id: 'mentions', label: 'Mentions', icon: AtSign, count: 0 },
  { id: 'created-by-you', label: 'Created by you', icon: Edit3 },
  { id: 'starred', label: 'Starred', icon: Star, count: 0 },
  { id: 'all', label: 'All', icon: Layers, count: 4 },
  { id: 'unassigned', label: 'Unassigned', icon: Users, count: 0 },
  { id: 'spam', label: 'Spam', icon: ShieldAlert, count: 0 }
];

const finItems: SidebarItem[] = [
  { id: 'fin-all', label: 'All conversations', icon: Bot },
  { id: 'fin-resolved', label: 'Resolved', icon: CheckCircle2 },
  { id: 'fin-escalated', label: 'Escalated & Handoff', icon: ArrowUpRight },
  { id: 'fin-pending', label: 'Pending', icon: Clock }
];

const viewItems = [
  { label: 'Messenger', icon: MessageSquare, count: 1 },
  { label: 'Email', icon: Mail, count: 1 },
  { label: 'WhatsApp & Social', icon: Hash, count: 1 },
  { label: 'Phone & SMS', icon: Phone, count: 1 },
  { label: 'Tickets', icon: Ticket, count: 0 }
];

interface InboxSidebarProps {
  currentView: InboxView;
  onViewChange: (view: InboxView) => void;
}

export function InboxSidebar({ currentView, onViewChange }: InboxSidebarProps) {
  const [finOpen, setFinOpen] = useState(true);
  const [viewsOpen, setViewsOpen] = useState(true);

  return (
    <div className='bg-sidebar flex h-full w-56 shrink-0 flex-col overflow-hidden border-r'>
      {/* Header */}
      <div className='flex h-12 items-center justify-between px-4'>
        <h2 className='text-sm font-semibold'>Inbox</h2>
        <Button variant='ghost' size='icon' className='h-6 w-6'>
          <Plus className='h-3.5 w-3.5' />
        </Button>
      </div>

      {/* Search */}
      <div className='px-3 pb-2'>
        <div className='relative'>
          <Search className='text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2' />
          <Input placeholder='Search' className='h-8 pl-8 text-xs' />
        </div>
      </div>

      <ScrollArea className='flex-1'>
        <div className='space-y-1 px-2 py-1'>
          {/* Main navigation items */}
          <div className='space-y-0.5'>
            {mainItems.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <Icon className='h-4 w-4 shrink-0' />
                  <span className='truncate'>{item.label}</span>
                  {item.count != null && (
                    <span className='text-muted-foreground ml-auto text-[11px]'>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
            {/* Dashboard */}
            <button className='text-muted-foreground hover:bg-accent/50 hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors'>
              <LayoutDashboard className='h-4 w-4 shrink-0' />
              <span className='truncate'>Dashboard</span>
            </button>
          </div>

          {/* SWEO AI Agent */}
          <Collapsible open={finOpen} onOpenChange={setFinOpen}>
            <div className='mt-4 flex items-center justify-between px-2'>
              <CollapsibleTrigger asChild>
                <button className='text-muted-foreground flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase'>
                  SWEO AI Agent
                  {finOpen ? (
                    <ChevronDown className='h-3 w-3' />
                  ) : (
                    <ChevronRight className='h-3 w-3' />
                  )}
                </button>
              </CollapsibleTrigger>
              <div className='flex items-center gap-0.5'>
                <Button variant='ghost' size='icon' className='h-5 w-5'>
                  <Plus className='h-3 w-3' />
                </Button>
              </div>
            </div>
            <CollapsibleContent>
              <div className='mt-1 space-y-0.5'>
                {finItems.map((item) => {
                  const Icon = item.icon;
                  const active = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                        active
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      )}
                    >
                      <Icon className='h-4 w-4 shrink-0' />
                      <span className='truncate'>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Team Inboxes */}
          <div className='mt-4 flex items-center justify-between px-2'>
            <span className='text-muted-foreground text-[11px] font-semibold tracking-wider uppercase'>
              Team Inboxes
            </span>
            <div className='flex items-center gap-0.5'>
              <Button variant='ghost' size='icon' className='h-5 w-5'>
                <Plus className='h-3 w-3' />
              </Button>
              <ChevronRight className='text-muted-foreground h-3 w-3' />
            </div>
          </div>

          {/* Teammates */}
          <div className='mt-4 flex items-center justify-between px-2'>
            <span className='text-muted-foreground text-[11px] font-semibold tracking-wider uppercase'>
              Teammates
            </span>
            <div className='flex items-center gap-0.5'>
              <Button variant='ghost' size='icon' className='h-5 w-5'>
                <Plus className='h-3 w-3' />
              </Button>
              <ChevronRight className='text-muted-foreground h-3 w-3' />
            </div>
          </div>

          {/* Views */}
          <Collapsible
            open={viewsOpen}
            onOpenChange={setViewsOpen}
            className='mt-4'
          >
            <div className='flex items-center justify-between px-2'>
              <CollapsibleTrigger asChild>
                <button className='text-muted-foreground flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase'>
                  Views
                  {viewsOpen ? (
                    <ChevronDown className='h-3 w-3' />
                  ) : (
                    <ChevronRight className='h-3 w-3' />
                  )}
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className='mt-1 space-y-0.5'>
                {viewItems.map((v) => {
                  const Icon = v.icon;
                  return (
                    <button
                      key={v.label}
                      className='text-muted-foreground hover:bg-accent/50 hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors'
                    >
                      <Icon className='h-4 w-4 shrink-0' />
                      <span className='truncate'>{v.label}</span>
                      {v.count != null && v.count > 0 && (
                        <span className='text-muted-foreground ml-auto text-[11px]'>
                          {v.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Get set up card */}
      <div className='border-t p-3'>
        <div className='bg-muted/50 rounded-lg p-3'>
          <p className='text-xs font-medium'>Get set up</p>
          <p className='text-muted-foreground mt-0.5 text-[10px]'>
            Set up channels to connect with your customers
          </p>
        </div>
      </div>
    </div>
  );
}
