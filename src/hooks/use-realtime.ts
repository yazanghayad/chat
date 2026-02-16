'use client';

import { useEffect, useRef, useCallback } from 'react';
import { client, APPWRITE_DATABASE } from '@/lib/appwrite/client';
import { COLLECTION } from '@/lib/appwrite/collections';
import type { Models } from 'appwrite';

type RealtimeEvent = 'create' | 'update' | 'delete';

interface UseRealtimeOptions<T extends Models.Document> {
  /** Collection to subscribe to */
  collection: keyof typeof COLLECTION;
  /** Only fire for these event types (default: all) */
  events?: RealtimeEvent[];
  /** Optional filter – return false to ignore the event */
  filter?: (payload: T) => boolean;
  /** Called when a matching event arrives */
  onEvent: (payload: T, event: RealtimeEvent) => void;
  /** Whether the subscription is active (default true) */
  enabled?: boolean;
}

/**
 * Subscribe to Appwrite Realtime events for a collection.
 *
 * Usage:
 * ```ts
 * useRealtime<Message>({
 *   collection: 'MESSAGES',
 *   events: ['create'],
 *   filter: (msg) => msg.conversationId === selectedId,
 *   onEvent: (msg) => setMessages(prev => [...prev, msg]),
 * });
 * ```
 */
export function useRealtime<T extends Models.Document>({
  collection,
  events,
  filter,
  onEvent,
  enabled = true
}: UseRealtimeOptions<T>) {
  // Keep callbacks stable via refs so subscription doesn't re-create
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const collectionId = COLLECTION[collection];

  useEffect(() => {
    if (!enabled || !APPWRITE_DATABASE || !collectionId) return;

    const channel = `databases.${APPWRITE_DATABASE}.collections.${collectionId}.documents`;

    const unsubscribe = client.subscribe<T>(channel, (response) => {
      // Determine event type from the events array
      // Appwrite events look like: "databases.*.collections.*.documents.*.create"
      const eventStr = response.events?.find((e) => e.includes('.documents.'));
      if (!eventStr) return;

      let eventType: RealtimeEvent = 'update';
      if (eventStr.endsWith('.create')) eventType = 'create';
      else if (eventStr.endsWith('.delete')) eventType = 'delete';
      else if (eventStr.endsWith('.update')) eventType = 'update';

      // Filter by event type
      if (events && !events.includes(eventType)) return;

      const payload = response.payload as T;

      // Optional user filter
      if (filterRef.current && !filterRef.current(payload)) return;

      onEventRef.current(payload, eventType);
    });

    return () => {
      unsubscribe();
    };
  }, [collectionId, enabled, events]);
}
