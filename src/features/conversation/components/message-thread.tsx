'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  listMessagesAction,
  updateConversationStatusAction
} from '@/features/conversation/actions/conversation-crud';
import { useRealtime } from '@/hooks/use-realtime';
import type { Message, ConversationStatus } from '@/types/appwrite';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MessageThreadProps {
  conversationId: string;
  tenantId: string;
}

export function MessageThread({
  conversationId,
  tenantId
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listMessagesAction(conversationId, tenantId);
    if (res.success) {
      setMessages(res.messages ?? []);
    }
    setLoading(false);
  }, [conversationId, tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Realtime: append new messages as they arrive ──────────────────────
  useRealtime<Message>({
    collection: 'MESSAGES',
    events: ['create'],
    filter: (msg) => msg.conversationId === conversationId,
    onEvent: (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.$id === msg.$id)) return prev;
        return [...prev, msg];
      });
    }
  });

  async function handleStatusChange(status: ConversationStatus) {
    const res = await updateConversationStatusAction(
      conversationId,
      tenantId,
      status
    );
    if (res.success) {
      toast.success(`Conversation ${status}`);
    } else {
      toast.error(res.error ?? 'Failed to update status');
    }
  }

  if (loading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Icons.spinner className='text-muted-foreground h-6 w-6 animate-spin' />
      </div>
    );
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b px-4 py-2'>
        <div className='text-sm font-medium'>
          Conversation{' '}
          <span className='text-muted-foreground font-mono text-xs'>
            {conversationId.slice(0, 8)}…
          </span>
        </div>
        <div className='flex gap-1'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleStatusChange('resolved')}
          >
            Resolve
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handleStatusChange('escalated')}
          >
            Escalate
          </Button>
          <Button variant='ghost' size='sm' onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className='flex-1 p-4' ref={scrollRef}>
        {messages.length === 0 ? (
          <div className='text-muted-foreground py-12 text-center text-sm'>
            No messages yet
          </div>
        ) : (
          <div className='space-y-4'>
            {messages.map((msg) => (
              <div
                key={msg.$id}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-4 py-2',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className='text-sm whitespace-pre-wrap'>{msg.content}</p>
                  <div
                    className={cn(
                      'mt-1 flex items-center gap-2 text-[10px]',
                      msg.role === 'user'
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    )}
                  >
                    <span>{new Date(msg.$createdAt).toLocaleTimeString()}</span>
                    {msg.confidence != null && (
                      <Badge variant='outline' className='h-4 px-1 text-[10px]'>
                        {(msg.confidence * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
