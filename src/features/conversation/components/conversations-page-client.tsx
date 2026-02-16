'use client';

import { useTenant } from '@/hooks/use-tenant';
import { Icons } from '@/components/icons';
import { ConversationList } from './conversation-list';
import { MessageThread } from './message-thread';
import { useState } from 'react';

export default function ConversationsPageClient() {
  const { tenant, loading, error } = useTenant();
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className='text-destructive py-20 text-center'>
        {error ?? 'Could not load tenant'}
      </div>
    );
  }

  return (
    <div className='flex h-[calc(100vh-180px)] gap-4'>
      {/* Left: Conversation list */}
      <div className='w-full max-w-md shrink-0 overflow-hidden rounded-lg border'>
        <ConversationList
          tenantId={tenant.$id}
          selectedId={selectedConvoId}
          onSelect={setSelectedConvoId}
        />
      </div>

      {/* Right: Message thread */}
      <div className='flex-1 overflow-hidden rounded-lg border'>
        {selectedConvoId ? (
          <MessageThread
            conversationId={selectedConvoId}
            tenantId={tenant.$id}
          />
        ) : (
          <div className='text-muted-foreground flex h-full items-center justify-center'>
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}
