'use client';

import * as React from 'react';
import { IconUpload, IconLink, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { uploadFileAction } from '@/features/knowledge/actions/upload-file';
import { ingestUrlAction } from '@/features/knowledge/actions/ingest-url';

interface SourceUploaderProps {
  tenantId: string;
  onSourceAdded?: () => void;
  className?: string;
}

export function SourceUploader({
  tenantId,
  onSourceAdded,
  className
}: SourceUploaderProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isIngesting, setIsIngesting] = React.useState(false);
  const [url, setUrl] = React.useState('');
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // File upload
  // ---------------------------------------------------------------------------

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadFileAction(tenantId, formData);

      if (result.success) {
        toast.success(`"${file.name}" uploaded and processing started`);
        onSourceAdded?.();
      } else {
        toast.error(result.error ?? 'Upload failed');
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
  }

  // ---------------------------------------------------------------------------
  // URL ingestion
  // ---------------------------------------------------------------------------

  async function handleUrlIngest(e: React.FormEvent) {
    e.preventDefault();

    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setIsIngesting(true);

    try {
      const result = await ingestUrlAction(tenantId, url.trim());

      if (result.success) {
        toast.success('URL ingestion started');
        setUrl('');
        onSourceAdded?.();
      } else {
        toast.error(result.error ?? 'URL ingestion failed');
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setIsIngesting(false);
    }
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Add Knowledge Source</CardTitle>
        <CardDescription>
          Upload documents or add URLs to build your AI knowledge base.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue='file'>
          <TabsList className='mb-4'>
            <TabsTrigger value='file'>
              <IconUpload className='mr-2 h-4 w-4' />
              File Upload
            </TabsTrigger>
            <TabsTrigger value='url'>
              <IconLink className='mr-2 h-4 w-4' />
              URL
            </TabsTrigger>
          </TabsList>

          {/* File Upload Tab */}
          <TabsContent value='file'>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-muted-foreground/25 hover:border-muted-foreground/50 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
                dragActive && 'border-primary bg-primary/5',
                isUploading && 'pointer-events-none opacity-60'
              )}
            >
              {isUploading ? (
                <IconLoader2 className='text-muted-foreground mb-2 h-10 w-10 animate-spin' />
              ) : (
                <IconUpload className='text-muted-foreground mb-2 h-10 w-10' />
              )}
              <p className='text-muted-foreground text-sm'>
                {isUploading
                  ? 'Uploading...'
                  : 'Drag & drop a file here, or click to browse'}
              </p>
              <p className='text-muted-foreground/70 mt-1 text-xs'>
                Supports PDF, DOCX, TXT, MD, CSV (max 20 MB)
              </p>
              <input
                ref={fileInputRef}
                type='file'
                className='hidden'
                accept='.pdf,.docx,.txt,.md,.csv'
                onChange={(e) => handleFileUpload(e.target.files)}
                disabled={isUploading}
              />
            </div>
          </TabsContent>

          {/* URL Tab */}
          <TabsContent value='url'>
            <form onSubmit={handleUrlIngest} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='source-url'>Website URL</Label>
                <Input
                  id='source-url'
                  type='url'
                  placeholder='https://example.com/docs/getting-started'
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isIngesting}
                />
              </div>
              <Button type='submit' disabled={isIngesting || !url.trim()}>
                {isIngesting ? (
                  <>
                    <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />
                    Ingesting...
                  </>
                ) : (
                  <>
                    <IconLink className='mr-2 h-4 w-4' />
                    Ingest URL
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
