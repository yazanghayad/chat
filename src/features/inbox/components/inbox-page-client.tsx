'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
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
  | 'fin-pending';

export interface InboxFilters {
  view: InboxView;
  status?: ConversationStatus;
  channel?: string;
  search?: string;
}

export default function InboxPageClient() {
  const { tenant, loading, error } = useTenant();
  const [filters, setFilters] = useState<InboxFilters>({ view: 'your-inbox' });
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(
    'demo-messenger'
  );
  const [showDetail, setShowDetail] = useState(true);
  const [threadMessages, setThreadMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);

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
        onViewChange={(view) => {
          setFilters((f) => ({ ...f, view }));
          setSelectedConvoId(null);
        }}
      />

      {/* Center: Conversation list */}
      <InboxConversationList
        tenantId={tenant.$id}
        filters={filters}
        selectedId={selectedConvoId}
        onSelect={setSelectedConvoId}
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
