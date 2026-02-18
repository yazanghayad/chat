'use client';

import { useEffect, useRef, useState } from 'react';
import {
  client,
  account,
  APPWRITE_DATABASE,
  APPWRITE_CONFIGURED
} from '@/lib/appwrite/client';
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
 * Only subscribes when Appwrite is configured AND the user has an
 * active session. This prevents the SDK from opening a WebSocket
 * that immediately fails and spams console.error.
 */
export function useRealtime<T extends Models.Document>({
  collection,
  events,
  filter,
  onEvent,
  enabled = true
}: UseRealtimeOptions<T>) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const collectionId = COLLECTION[collection];

  // Check for an active Appwrite session before subscribing
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!APPWRITE_CONFIGURED) return;
    let cancelled = false;
    account
      .get()
      .then(() => {
        if (!cancelled) setHasSession(true);
      })
      .catch(() => {
        // No session — Realtime won't work
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !enabled ||
      !hasSession ||
      !APPWRITE_CONFIGURED ||
      !APPWRITE_DATABASE ||
      !collectionId
    )
      return;

    const channel = `databases.${APPWRITE_DATABASE}.collections.${collectionId}.documents`;

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = client.subscribe<T>(channel, (response) => {
        const eventStr = response.events?.find((e) =>
          e.includes('.documents.')
        );
        if (!eventStr) return;

        let eventType: RealtimeEvent = 'update';
        if (eventStr.endsWith('.create')) eventType = 'create';
        else if (eventStr.endsWith('.delete')) eventType = 'delete';
        else if (eventStr.endsWith('.update')) eventType = 'update';

        if (events && !events.includes(eventType)) return;

        const payload = response.payload as T;
        if (filterRef.current && !filterRef.current(payload)) return;

        onEventRef.current(payload, eventType);
      });
    } catch {
      // Appwrite Realtime not available — silently degrade
    }

    return () => {
      unsubscribe?.();
    };
  }, [collectionId, enabled, events, hasSession]);
}
