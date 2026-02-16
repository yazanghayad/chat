'use client';

import { useEffect, useState, useCallback } from 'react';
import { listConversationsAction } from '@/features/conversation/actions/conversation-crud';
import { useRealtime } from '@/hooks/use-realtime';
import type { Conversation, ConversationStatus } from '@/types/appwrite';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  tenantId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const statusColors: Record<ConversationStatus, string> = {
  active: 'bg-green-500',
  resolved: 'bg-blue-500',
  escalated: 'bg-orange-500'
};

const channelLabels: Record<string, string> = {
  web: 'Web',
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  voice: 'Voice'
};

export function ConversationList({
  tenantId,
  selectedId,
  onSelect
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listConversationsAction(tenantId, {
      status:
        statusFilter !== 'all'
          ? (statusFilter as ConversationStatus)
          : undefined,
      channel: channelFilter !== 'all' ? channelFilter : undefined,
      limit: 50
    });
    if (res.success) {
      setConversations(res.conversations ?? []);
      setTotal(res.total ?? 0);
    }
    setLoading(false);
  }, [tenantId, statusFilter, channelFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Realtime: auto-refresh when conversations are created or updated ──
  useRealtime<Conversation>({
    collection: 'CONVERSATIONS',
    events: ['create', 'update'],
    filter: (convo) => convo.tenantId === tenantId,
    onEvent: () => load()
  });

  return (
    <div className='flex h-full flex-col'>
      {/* Filters */}
      <div className='space-y-2 border-b p-3'>
        <div className='flex gap-2'>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='h-8 flex-1'>
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All status</SelectItem>
              <SelectItem value='active'>Active</SelectItem>
              <SelectItem value='resolved'>Resolved</SelectItem>
              <SelectItem value='escalated'>Escalated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className='h-8 flex-1'>
              <SelectValue placeholder='Channel' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All channels</SelectItem>
              <SelectItem value='web'>Web</SelectItem>
              <SelectItem value='email'>Email</SelectItem>
              <SelectItem value='whatsapp'>WhatsApp</SelectItem>
              <SelectItem value='sms'>SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='text-muted-foreground text-xs'>
          {total} conversation{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* List */}
      <ScrollArea className='flex-1'>
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <Icons.spinner className='text-muted-foreground h-6 w-6 animate-spin' />
          </div>
        ) : conversations.length === 0 ? (
          <div className='text-muted-foreground py-12 text-center text-sm'>
            No conversations found
          </div>
        ) : (
          <div className='divide-y'>
            {conversations.map((convo) => (
              <button
                key={convo.$id}
                onClick={() => onSelect(convo.$id)}
                className={cn(
                  'hover:bg-muted/50 w-full px-3 py-3 text-left transition-colors',
                  selectedId === convo.$id && 'bg-muted'
                )}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        statusColors[convo.status]
                      )}
                    />
                    <span className='text-sm font-medium'>
                      {convo.userId ?? 'Anonymous'}
                    </span>
                  </div>
                  <Badge variant='outline' className='text-[10px]'>
                    {channelLabels[convo.channel] ?? convo.channel}
                  </Badge>
                </div>
                <div className='text-muted-foreground mt-1 flex items-center justify-between text-xs'>
                  <span className='capitalize'>{convo.status}</span>
                  <span>{new Date(convo.$createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Refresh button */}
      <div className='border-t p-2'>
        <Button
          variant='ghost'
          size='sm'
          className='w-full'
          onClick={load}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
}
