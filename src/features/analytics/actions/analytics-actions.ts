'use server';

/**
 * Analytics server action wrapper.
 * Wraps the analytics engine for use from client components.
 */

import { createSessionClient } from '@/lib/appwrite/server';
import {
  getAnalytics,
  type AnalyticsMetrics
} from '@/lib/analytics/analytics-engine';
import {
  listSuggestionsAction,
  approveSuggestionAction,
  dismissSuggestionAction
} from '@/features/analytics/actions/suggestion-crud';

export async function getAnalyticsAction(
  tenantId: string,
  days: number = 30
): Promise<{ success: boolean; metrics?: AnalyticsMetrics; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await getAnalytics(tenantId, startDate, endDate);

    return { success: true, metrics };
  } catch (err) {
    console.error('getAnalyticsAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load analytics'
    };
  }
}

// Re-export suggestion actions for convenience
export {
  listSuggestionsAction,
  approveSuggestionAction,
  dismissSuggestionAction
};
