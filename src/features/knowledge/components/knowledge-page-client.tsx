'use client';

import * as React from 'react';
import { SourceUploader } from '@/features/knowledge/components/source-uploader';
import { SourceList } from '@/features/knowledge/components/source-list';
import { useTenant } from '@/hooks/use-tenant';
import { IconLoader2 } from '@tabler/icons-react';

/**
 * Knowledge management page – client component that manages refresh state
 * and passes the tenantId to child components.
 */
export default function KnowledgePageClient() {
  const { tenant, loading, error } = useTenant();
  const [refreshKey, setRefreshKey] = React.useState(0);

  function handleSourceAdded() {
    setRefreshKey((k) => k + 1);
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-24'>
        <IconLoader2 className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className='text-muted-foreground py-24 text-center'>
        {error ?? 'No tenant found. Please log in again.'}
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <SourceUploader tenantId={tenant.$id} onSourceAdded={handleSourceAdded} />
      <SourceList tenantId={tenant.$id} refreshKey={refreshKey} />
    </div>
  );
}
