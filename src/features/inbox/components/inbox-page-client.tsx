'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { getInboxCountsAction } from '@/features/conversation/actions/conversation-crud';
import { Icons } from '@/components/icons';
import { InboxSidebar } from './inbox-sidebar';
import { InboxConversationList } from './inbox-conversation-list';
import { InboxThread } from './inbox-thread';
import { InboxDetailPanel } from './inbox-detail-panel';
import type { ConversationStatus } from '@/types/appwrite';

export type InboxView =
  | 'your-inbox'
  | 'mentions'
  | 'created-by-you'
  | 'starred'
  | 'all'
  | 'unassigned'
  | 'spam'
  | 'fin-all'
  | 'fin-resolved'
  | 'fin-escalated'
  | 'fin-pending'
  | 'channel-web'
  | 'channel-email'
  | 'channel-whatsapp'
  | 'channel-sms'
  | 'channel-voice';

export interface InboxFilters {
  view: InboxView;
  status?: ConversationStatus;
  channel?: string;
  search?: string;
}

export interface InboxCounts {
  total: number;
  active: number;
  resolved: number;
  escalated: number;
  byChannel: Record<string, number>;
}

export default function InboxPageClient() {
  const { tenant, loading, error } = useTenant();
  const [filters, setFilters] = useState<InboxFilters>({ view: 'your-inbox' });
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(true);
  const [threadMessages, setThreadMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [counts, setCounts] = useState<InboxCounts>({
    total: 0,
    active: 0,
    resolved: 0,
    escalated: 0,
    byChannel: {}
  });

  const loadCounts = useCallback(async () => {
    if (!tenant) return;
    const res = await getInboxCountsAction(tenant.$id);
    if (res.success && res.counts) setCounts(res.counts);
  }, [tenant]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  if (loading) {
    return (
      <div className='flex h-[calc(100vh-52px)] items-center justify-center'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className='text-destructive flex h-[calc(100vh-52px)] items-center justify-center'>
        {error ?? 'Could not load tenant'}
      </div>
    );
  }

  return (
    <div className='flex flex-1 overflow-hidden'>
      {/* Left: Inbox navigation sidebar */}
      <InboxSidebar
        currentView={filters.view}
        counts={counts}
        onViewChange={(view) => {
          // Map channel views to channel filter
          const channelMap: Record<string, string> = {
            'channel-web': 'web',
            'channel-email': 'email',
            'channel-whatsapp': 'whatsapp',
            'channel-sms': 'sms',
            'channel-voice': 'voice'
          };
          const channel = channelMap[view];
          setFilters((f) => ({ ...f, view, channel }));
          setSelectedConvoId(null);
        }}
      />

      {/* Center: Conversation list */}
      <InboxConversationList
        tenantId={tenant.$id}
        filters={filters}
        selectedId={selectedConvoId}
        onSelect={(id) => {
          setSelectedConvoId(id);
          // Clear stale context so Copilot doesn't show old conversation data
          setThreadMessages([]);
        }}
        userName={tenant.name ?? 'User'}
      />

      {/* Right: Thread + detail */}
      <div className='flex min-w-0 flex-1'>
        {selectedConvoId ? (
          <>
            <div className='min-w-0 flex-1'>
              <InboxThread
                conversationId={selectedConvoId}
                tenantId={tenant.$id}
                onToggleDetail={() => setShowDetail((v) => !v)}
                onMessagesLoaded={setThreadMessages}
              />
            </div>
            {showDetail && (
              <InboxDetailPanel
                conversationId={selectedConvoId}
                tenantId={tenant.$id}
                conversationMessages={threadMessages}
              />
            )}
          </>
        ) : (
          <div className='text-muted-foreground flex flex-1 items-center justify-center'>
            <div className='text-center'>
              <Icons.conversations className='mx-auto mb-3 h-12 w-12 opacity-20' />
              <p className='text-sm'>Select a conversation to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
