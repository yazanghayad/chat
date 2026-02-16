'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface WidgetInstallProps {
  apiKey: string;
  apiUrl: string;
}

export function WidgetInstall({ apiKey, apiUrl }: WidgetInstallProps) {
  const [color, setColor] = useState('#6366f1');
  const [position, setPosition] = useState<'right' | 'left'>('right');
  const [title, setTitle] = useState('Chat with us');

  const snippet = `<script
  src="${apiUrl}/api/widget/chat-widget.js"
  data-api-key="${apiKey}"
  data-api-url="${apiUrl}"
  data-title="${title}"
  data-color="${color}"
  data-position="${position}"
></script>`;

  function copySnippet() {
    navigator.clipboard.writeText(snippet);
    toast.success('Copied to clipboard');
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center gap-2'>
          <CardTitle className='text-base'>Chat Widget</CardTitle>
          <Badge variant='outline' className='text-xs'>
            Embed
          </Badge>
        </div>
        <CardDescription>
          Add this script tag to your website to enable the AI chat widget.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Config */}
        <div className='grid grid-cols-3 gap-3'>
          <div>
            <label className='text-muted-foreground mb-1 block text-xs'>
              Title
            </label>
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className='border-input w-full rounded border px-2 py-1.5 text-sm'
            />
          </div>
          <div>
            <label className='text-muted-foreground mb-1 block text-xs'>
              Color
            </label>
            <div className='flex items-center gap-2'>
              <input
                type='color'
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className='h-8 w-8 cursor-pointer rounded border-none'
              />
              <span className='text-muted-foreground text-xs'>{color}</span>
            </div>
          </div>
          <div>
            <label className='text-muted-foreground mb-1 block text-xs'>
              Position
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as 'right' | 'left')}
              className='border-input w-full rounded border px-2 py-1.5 text-sm'
            >
              <option value='right'>Bottom Right</option>
              <option value='left'>Bottom Left</option>
            </select>
          </div>
        </div>

        {/* Code snippet */}
        <div className='relative'>
          <pre className='bg-muted overflow-x-auto rounded-lg p-4 text-xs'>
            <code>{snippet}</code>
          </pre>
          <Button
            size='sm'
            variant='secondary'
            className='absolute top-2 right-2'
            onClick={copySnippet}
          >
            Copy
          </Button>
        </div>

        <p className='text-muted-foreground text-xs'>
          Paste this before the closing{' '}
          <code className='bg-muted rounded px-1'>&lt;/body&gt;</code> tag on
          any page where you want the chat widget to appear.
        </p>
      </CardContent>
    </Card>
  );
}
