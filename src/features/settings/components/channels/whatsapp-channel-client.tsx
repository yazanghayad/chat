'use client';

import { useState } from 'react';
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
import { ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function WhatsAppChannelClient() {
  const [enabled, setEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');

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
          <h2 className='text-lg font-semibold'>WhatsApp</h2>
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
              <p className='text-sm font-medium'>Enable WhatsApp</p>
              <p className='text-muted-foreground text-xs'>
                Receive and respond to WhatsApp messages via Twilio
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Twilio Configuration</CardTitle>
          <CardDescription>
            Connect your Twilio account for WhatsApp Business
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-2'>
            <Label>Account SID</Label>
            <Input
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              placeholder='AC...'
              type='password'
            />
          </div>
          <div className='grid gap-2'>
            <Label>Auth Token</Label>
            <Input
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder='Enter auth token'
              type='password'
            />
          </div>
          <div className='grid gap-2'>
            <Label>WhatsApp Phone Number</Label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder='+1234567890'
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Webhook URL</CardTitle>
          <CardDescription>
            Configure this URL in your Twilio console
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='bg-muted rounded-lg p-4'>
            <code className='text-primary text-sm'>
              {typeof window !== 'undefined'
                ? window.location.origin
                : 'https://your-app.com'}
              /api/webhooks/whatsapp
            </code>
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button onClick={() => toast.success('WhatsApp settings saved')}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
