'use client';

import * as React from 'react';
import {
  IconFile,
  IconLink,
  IconTrash,
  IconLoader2,
  IconCheck,
  IconX,
  IconRefresh
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { KnowledgeSource } from '@/types/appwrite';
import {
  listSourcesAction,
  deleteSourceAction
} from '@/features/knowledge/actions/list-sources';

interface SourceListProps {
  tenantId: string;
  /** Incremented externally when new sources are added. */
  refreshKey?: number;
  className?: string;
}

const STATUS_CONFIG = {
  processing: {
    label: 'Processing',
    variant: 'secondary' as const,
    icon: IconLoader2,
    iconClass: 'animate-spin'
  },
  ready: {
    label: 'Ready',
    variant: 'default' as const,
    icon: IconCheck,
    iconClass: ''
  },
  failed: {
    label: 'Failed',
    variant: 'destructive' as const,
    icon: IconX,
    iconClass: ''
  }
};

export function SourceList({
  tenantId,
  refreshKey = 0,
  className
}: SourceListProps) {
  const [sources, setSources] = React.useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const loadSources = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await listSourcesAction(tenantId);
      if (result.success && result.sources) {
        setSources(result.sources);
      } else {
        toast.error(result.error ?? 'Failed to load sources');
      }
    } catch (err) {
      toast.error('Failed to load knowledge sources');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Load on mount and when refreshKey changes
  React.useEffect(() => {
    loadSources();
  }, [loadSources, refreshKey]);

  // Auto-refresh while any source is processing
  React.useEffect(() => {
    const hasProcessing = sources.some((s) => s.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(loadSources, 5000);
    return () => clearInterval(interval);
  }, [sources, loadSources]);

  async function handleDelete(sourceId: string) {
    setDeleting(sourceId);
    try {
      const result = await deleteSourceAction(sourceId, tenantId);
      if (result.success) {
        setSources((prev) => prev.filter((s) => s.$id !== sourceId));
        toast.success('Source deleted');
      } else {
        toast.error(result.error ?? 'Failed to delete source');
      }
    } catch {
      toast.error('Failed to delete source');
    } finally {
      setDeleting(null);
    }
  }

  function getMetadata(source: KnowledgeSource): Record<string, unknown> {
    if (typeof source.metadata === 'string') {
      try {
        return JSON.parse(source.metadata);
      } catch {
        return {};
      }
    }
    return (source.metadata as Record<string, unknown>) ?? {};
  }

  function getSourceLabel(source: KnowledgeSource): string {
    const meta = getMetadata(source);
    if (source.type === 'file') {
      return (meta.fileName as string) ?? 'Uploaded file';
    }
    if (source.type === 'url') {
      return source.url ?? (meta.originalUrl as string) ?? 'URL source';
    }
    return 'Manual entry';
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle>Knowledge Sources</CardTitle>
          <CardDescription>
            {sources.length} source{sources.length !== 1 && 's'} indexed
          </CardDescription>
        </div>
        <Button variant='ghost' size='icon' onClick={loadSources}>
          <IconRefresh className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading && sources.length === 0 ? (
          <div className='flex items-center justify-center py-12'>
            <IconLoader2 className='text-muted-foreground h-6 w-6 animate-spin' />
          </div>
        ) : sources.length === 0 ? (
          <div className='text-muted-foreground py-12 text-center text-sm'>
            No knowledge sources yet. Upload a file or add a URL above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className='w-[60px]' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => {
                const status =
                  STATUS_CONFIG[source.status] ?? STATUS_CONFIG.failed;
                const StatusIcon = status.icon;
                const meta = getMetadata(source);

                return (
                  <TableRow key={source.$id}>
                    <TableCell className='max-w-[300px] truncate font-medium'>
                      {source.type === 'file' ? (
                        <IconFile className='mr-2 inline h-4 w-4' />
                      ) : (
                        <IconLink className='mr-2 inline h-4 w-4' />
                      )}
                      {getSourceLabel(source)}
                    </TableCell>
                    <TableCell className='capitalize'>{source.type}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>
                        <StatusIcon
                          className={cn('mr-1 h-3 w-3', status.iconClass)}
                        />
                        {status.label}
                        {source.status === 'ready' &&
                          meta.chunksCount != null && (
                            <span className='ml-1 opacity-70'>
                              ({String(meta.chunksCount)} chunks)
                            </span>
                          )}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {formatDistanceToNow(new Date(source.$createdAt), {
                        addSuffix: true
                      })}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            disabled={deleting === source.$id}
                          >
                            {deleting === source.$id ? (
                              <IconLoader2 className='h-4 w-4 animate-spin' />
                            ) : (
                              <IconTrash className='h-4 w-4' />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete source?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the knowledge source
                              and all its indexed vectors. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(source.$id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
