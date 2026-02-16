'use server';

/**
 * Content suggestion server actions (AI Flywheel).
 */

import { createAdminClient, createSessionClient } from '@/lib/appwrite/server';
import { APPWRITE_DATABASE } from '@/lib/appwrite/constants';
import { COLLECTION } from '@/lib/appwrite/collections';
import { Query } from 'node-appwrite';
import type { ContentSuggestion } from '@/types/appwrite';
import { logAuditEventAsync } from '@/lib/audit/logger';

// ---------------------------------------------------------------------------
// List pending suggestions
// ---------------------------------------------------------------------------

export async function listSuggestionsAction(
  tenantId: string,
  status: 'pending' | 'approved' | 'dismissed' = 'pending'
): Promise<{
  success: boolean;
  suggestions?: ContentSuggestion[];
  error?: string;
}> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();
    const result = await databases.listDocuments<ContentSuggestion>(
      APPWRITE_DATABASE,
      COLLECTION.CONTENT_SUGGESTIONS,
      [
        Query.equal('tenantId', tenantId),
        Query.equal('status', status),
        Query.orderDesc('frequency'),
        Query.limit(50)
      ]
    );

    const suggestions = result.documents.map(parseSuggestionDoc);

    return { success: true, suggestions };
  } catch (err) {
    console.error('listSuggestionsAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to list suggestions'
    };
  }
}

// ---------------------------------------------------------------------------
// Approve suggestion → create knowledge source
// ---------------------------------------------------------------------------

export async function approveSuggestionAction(
  suggestionId: string,
  tenantId: string
): Promise<{ success: boolean; sourceId?: string; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();

    const doc = await databases.getDocument<ContentSuggestion>(
      APPWRITE_DATABASE,
      COLLECTION.CONTENT_SUGGESTIONS,
      suggestionId
    );
    if (doc.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    // Mark as approved
    await databases.updateDocument(
      APPWRITE_DATABASE,
      COLLECTION.CONTENT_SUGGESTIONS,
      suggestionId,
      { status: 'approved' }
    );

    // Create a manual knowledge source from the suggestion content
    const { createManualSourceAction } = await import(
      '@/features/knowledge/actions/manual-source'
    );

    const suggestion = parseSuggestionDoc(doc);
    const result = await createManualSourceAction(
      tenantId,
      suggestion.topic,
      suggestion.suggestedContent
    );

    logAuditEventAsync(tenantId, 'suggestion.approved', {
      suggestionId,
      topic: suggestion.topic,
      sourceId: result.sourceId
    });

    return { success: true, sourceId: result.sourceId };
  } catch (err) {
    console.error('approveSuggestionAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to approve suggestion'
    };
  }
}

// ---------------------------------------------------------------------------
// Dismiss suggestion
// ---------------------------------------------------------------------------

export async function dismissSuggestionAction(
  suggestionId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await (await createSessionClient()).account.get();

    const { databases } = createAdminClient();

    const doc = await databases.getDocument<ContentSuggestion>(
      APPWRITE_DATABASE,
      COLLECTION.CONTENT_SUGGESTIONS,
      suggestionId
    );
    if (doc.tenantId !== tenantId) {
      return { success: false, error: 'Access denied' };
    }

    await databases.updateDocument(
      APPWRITE_DATABASE,
      COLLECTION.CONTENT_SUGGESTIONS,
      suggestionId,
      { status: 'dismissed' }
    );

    logAuditEventAsync(tenantId, 'suggestion.dismissed', {
      suggestionId
    });

    return { success: true };
  } catch (err) {
    console.error('dismissSuggestionAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to dismiss suggestion'
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSuggestionDoc(doc: ContentSuggestion): ContentSuggestion {
  return {
    ...doc,
    exampleQueries:
      typeof doc.exampleQueries === 'string'
        ? JSON.parse(doc.exampleQueries)
        : doc.exampleQueries
  };
}
