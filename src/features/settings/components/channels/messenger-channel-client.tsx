'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, Copy, MessageSquare, Code, Eye } from 'lucide-react';
import Link from 'next/link';

export default function MessengerChannelClient() {
  const { tenant, loading } = useTenant();
  const [enabled, setEnabled] = useState(true);
  const [showLauncher, setShowLauncher] = useState(true);
  const [collectEmail, setCollectEmail] = useState(true);

  const apiKey = tenant?.apiKey ?? 'YOUR_API_KEY';
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://your-app.com';
  const snippet = `<script
  src="${origin}/api/widget/loader.js"
  data-api-key="${apiKey}"
  data-api-url="${origin}"
  async>
</script>`;

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='space-y-6 pb-8'>
      <div className='flex items-center gap-3'>
        <Link
          href='/dashboard/settings'
          className='text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='h-5 w-5' />
        </Link>
        <div className='flex items-center gap-2'>
          <MessageSquare className='h-5 w-5' />
          <h2 className='text-lg font-semibold'>Messenger</h2>
          <Badge variant={enabled ? 'default' : 'secondary'}>
            {enabled ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Channel Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Enable Messenger</p>
              <p className='text-muted-foreground text-xs'>
                Allow customers to chat via the web messenger widget
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Code className='h-4 w-4' />
            Install Code
          </CardTitle>
          <CardDescription>
            Add this snippet to your website&apos;s HTML
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='relative'>
            <pre className='bg-muted overflow-x-auto rounded-lg p-4 text-xs'>
              <code>{snippet}</code>
            </pre>
            <Button
              variant='outline'
              size='sm'
              className='absolute top-2 right-2'
              onClick={() => {
                navigator.clipboard.writeText(snippet);
                toast.success('Copied to clipboard');
              }}
            >
              <Copy className='mr-1 h-3 w-3' />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Eye className='h-4 w-4' />
            Behavior
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Show launcher</p>
              <p className='text-muted-foreground text-xs'>
                Display the floating chat button on your site
              </p>
            </div>
            <Switch checked={showLauncher} onCheckedChange={setShowLauncher} />
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Collect email</p>
              <p className='text-muted-foreground text-xs'>
                Ask for email before starting a conversation
              </p>
            </div>
            <Switch checked={collectEmail} onCheckedChange={setCollectEmail} />
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button onClick={() => toast.success('Messenger settings saved')}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
