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
import { ArrowLeft, MessageCircle, Clock, Shield } from 'lucide-react';
import Link from 'next/link';

export default function SmsChannelClient() {
  const { tenant, loading } = useTenant();
  const [enabled, setEnabled] = useState(false);
  const [autoReply, setAutoReply] = useState(true);
  const [optOut, setOptOut] = useState(true);

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
          <MessageCircle className='h-5 w-5' />
          <h2 className='text-lg font-semibold'>SMS</h2>
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
              <p className='text-sm font-medium'>Enable SMS</p>
              <p className='text-muted-foreground text-xs'>
                Allow customers to reach support via text messages (Twilio)
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <MessageCircle className='h-4 w-4' />
            SMS Configuration
          </CardTitle>
          <CardDescription>
            Connect your Twilio account for SMS messaging
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>Twilio Phone Number</Label>
            <Input placeholder='+1 (555) 000-0000' />
          </div>
          <div className='space-y-2'>
            <Label>Twilio Account SID</Label>
            <Input placeholder='AC...' type='password' />
          </div>
          <div className='space-y-2'>
            <Label>Twilio Auth Token</Label>
            <Input placeholder='••••••••' type='password' />
          </div>
          <div className='space-y-2'>
            <Label>Sender Name (Alphanumeric ID)</Label>
            <Input placeholder='SWEO' maxLength={11} />
            <p className='text-muted-foreground text-xs'>
              Max 11 characters. Used as sender name where supported.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Clock className='h-4 w-4' />
            Auto-Reply
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>AI auto-reply</p>
              <p className='text-muted-foreground text-xs'>
                Let SWEO AI respond to incoming SMS automatically
              </p>
            </div>
            <Switch checked={autoReply} onCheckedChange={setAutoReply} />
          </div>
          <Separator />
          <div className='space-y-2'>
            <Label>Welcome message</Label>
            <Input placeholder="Hi! You've reached SWEO support. How can we help?" />
          </div>
          <div className='space-y-2'>
            <Label>Away message</Label>
            <Input placeholder="We're currently offline. We'll get back to you shortly." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Shield className='h-4 w-4' />
            Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Opt-out handling</p>
              <p className='text-muted-foreground text-xs'>
                Automatically handle STOP/UNSUBSCRIBE keywords
              </p>
            </div>
            <Switch checked={optOut} onCheckedChange={setOptOut} />
          </div>
          <Separator />
          <div className='space-y-2'>
            <Label>Opt-out confirmation</Label>
            <Input placeholder='You have been unsubscribed. Reply START to re-subscribe.' />
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button onClick={() => toast.success('SMS settings saved')}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
