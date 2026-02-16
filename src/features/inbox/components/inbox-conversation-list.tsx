'use client';

import { useEffect, useState, useCallback } from 'react';
import { listConversationsAction } from '@/features/conversation/actions/conversation-crud';
import { useRealtime } from '@/hooks/use-realtime';
import type { Conversation, ConversationStatus } from '@/types/appwrite';
import type { InboxFilters } from './inbox-page-client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { ArrowDownUp, Mail, MessageSquare, Phone, Search } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/format';

/* Channel display config */
const channelConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
    letterBg: string;
  }
> = {
  web: {
    icon: MessageSquare,
    label: 'Messenger',
    color: 'text-blue-600',
    letterBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-emerald-600',
    letterBg:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
  },
  whatsapp: {
    icon: MessageSquare,
    label: 'WhatsApp',
    color: 'text-green-600',
    letterBg:
      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
  },
  sms: {
    icon: Phone,
    label: 'Phone',
    color: 'text-purple-600',
    letterBg:
      'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
  },
  voice: {
    icon: Phone,
    label: 'Phone',
    color: 'text-orange-600',
    letterBg:
      'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
  }
};

/* Demo fallback data shown when no real conversations exist */
const demoConversations = [
  {
    $id: 'demo-messenger',
    channel: 'web',
    status: 'active' as ConversationStatus,
    userId: 'Messenger - [Demo]',
    metadata: '{}',
    tenantId: '',
    resolvedAt: null,
    $createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    $updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    $permissions: [],
    $databaseId: '',
    $collectionId: '',
    _preview: 'Install Messenger'
  },
  {
    $id: 'demo-email',
    channel: 'email',
    status: 'active' as ConversationStatus,
    userId: 'Email - [Demo]',
    metadata: '{}',
    tenantId: '',
    resolvedAt: null,
    $createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    $updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    $permissions: [],
    $databaseId: '',
    $collectionId: '',
    _preview: 'This is a demo email. It sho...'
  },
  {
    $id: 'demo-whatsapp',
    channel: 'whatsapp',
    status: 'active' as ConversationStatus,
    userId: 'WhatsApp - [Demo]',
    metadata: '{}',
    tenantId: '',
    resolvedAt: null,
    $createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    $updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    $permissions: [],
    $databaseId: '',
    $collectionId: '',
    _preview: 'Set up WhatsApp or social ...'
  },
  {
    $id: 'demo-phone',
    channel: 'sms',
    status: 'active' as ConversationStatus,
    userId: 'Phone - [Demo]',
    metadata: '{}',
    tenantId: '',
    resolvedAt: null,
    $createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    $updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    $permissions: [],
    $databaseId: '',
    $collectionId: '',
    _preview: 'Set up phone or SMS'
  }
];

interface InboxConversationListProps {
  tenantId: string;
  filters: InboxFilters;
  selectedId: string | null;
  onSelect: (id: string) => void;
  userName?: string;
}

export function InboxConversationList({
  tenantId,
  filters,
  selectedId,
  onSelect,
  userName = 'User'
}: InboxConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const viewToStatus = useCallback((): ConversationStatus | undefined => {
    switch (filters.view) {
      case 'fin-resolved':
        return 'resolved';
      case 'fin-escalated':
        return 'escalated';
      case 'fin-pending':
        return 'active';
      default:
        return filters.status;
    }
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listConversationsAction(tenantId, {
      status: viewToStatus(),
      channel: filters.channel,
      limit: 50
    });
    if (res.success) {
      setConversations(res.conversations ?? []);
      setTotal(res.total ?? 0);
    }
    setLoading(false);
  }, [tenantId, viewToStatus, filters.channel]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime<Conversation>({
    collection: 'CONVERSATIONS',
    events: ['create', 'update'],
    filter: (convo) => convo.tenantId === tenantId,
    onEvent: () => load()
  });

  /* Use demo data when no real conversations */
  const displayList =
    conversations.length > 0
      ? conversations
      : (demoConversations as unknown as Conversation[]);
  const openCount =
    conversations.length > 0
      ? conversations.filter((c) => c.status === 'active').length
      : demoConversations.length;

  const filtered = search
    ? displayList.filter(
        (c) =>
          (c.userId ?? '').toLowerCase().includes(search.toLowerCase()) ||
          c.$id.toLowerCase().includes(search.toLowerCase())
      )
    : displayList;

  return (
    <div className='flex h-full w-80 shrink-0 flex-col overflow-hidden border-r'>
      {/* header with user name + search icon */}
      <div className='flex h-12 items-center justify-between border-b px-4'>
        <span className='truncate text-sm font-semibold'>{userName}</span>
        <Search className='text-muted-foreground h-4 w-4 shrink-0' />
      </div>

      {/* Open count + sort */}
      <div className='flex items-center justify-between border-b px-4 py-2'>
        <span className='text-muted-foreground text-xs font-medium'>
          {openCount} Open
        </span>
        <button className='text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors'>
          Last activity
          <ArrowDownUp className='h-3 w-3' />
        </button>
      </div>

      {/* Search (collapsible via icon above) */}
      <div className='border-b p-2'>
        <div className='relative'>
          <Search className='text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2' />
          <Input
            placeholder='Search conversations...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='h-8 pl-8 text-xs'
          />
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className='flex-1'>
        {loading && conversations.length === 0 ? (
          <div className='flex items-center justify-center py-12'>
            <Icons.spinner className='text-muted-foreground h-5 w-5 animate-spin' />
          </div>
        ) : filtered.length === 0 ? (
          <div className='text-muted-foreground py-12 text-center text-sm'>
            No conversations
          </div>
        ) : (
          <div className='divide-y'>
            {filtered.map((convo) => {
              const cfg = channelConfig[convo.channel] ?? channelConfig.web;
              const letter = cfg.label.charAt(0).toUpperCase();
              const preview = (convo as unknown as Record<string, unknown>)
                ._preview as string | undefined;

              return (
                <button
                  key={convo.$id}
                  onClick={() => onSelect(convo.$id)}
                  className={cn(
                    'w-full px-3 py-3 text-left transition-colors',
                    selectedId === convo.$id ? 'bg-accent' : 'hover:bg-muted/50'
                  )}
                >
                  <div className='flex items-start gap-2.5'>
                    {/* Channel letter avatar */}
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        cfg.letterBg
                      )}
                    >
                      {letter}
                    </div>

                    <div className='min-w-0 flex-1'>
                      {/* Title row */}
                      <div className='flex items-center justify-between'>
                        <span className='truncate text-sm font-medium'>
                          {convo.userId ?? 'Anonymous'}
                        </span>
                        <span className='text-muted-foreground shrink-0 pl-2 text-[10px]'>
                          {formatDistanceToNow(convo.$createdAt)}
                        </span>
                      </div>
                      {/* Subtitle / preview */}
                      <p className='text-muted-foreground mt-0.5 truncate text-xs'>
                        {preview ?? convo.status}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
