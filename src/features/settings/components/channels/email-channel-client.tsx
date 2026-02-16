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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Plus } from 'lucide-react';
import Link from 'next/link';

interface EmailAddress {
  id: string;
  address: string;
  type: 'forwarding' | 'custom';
  verified: boolean;
}

export default function EmailChannelClient() {
  const [enabled, setEnabled] = useState(true);
  const [addresses, setAddresses] = useState<EmailAddress[]>([
    {
      id: '1',
      address: 'support@company.com',
      type: 'forwarding',
      verified: true
    }
  ]);
  const [newAddress, setNewAddress] = useState('');
  const [replyFrom, setReplyFrom] = useState('default');
  const [autoReply, setAutoReply] = useState(true);

  function addAddress() {
    if (!newAddress) return;
    setAddresses((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        address: newAddress,
        type: 'forwarding',
        verified: false
      }
    ]);
    setNewAddress('');
    toast.success('Verification email sent');
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
          <Mail className='h-5 w-5' />
          <h2 className='text-lg font-semibold'>Email</h2>
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
              <p className='text-sm font-medium'>Enable Email Channel</p>
              <p className='text-muted-foreground text-xs'>
                Receive and respond to support emails
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Email Addresses</CardTitle>
          <CardDescription>
            Manage email addresses for receiving support requests
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className='flex items-center justify-between rounded-lg border p-3'
            >
              <div className='flex items-center gap-2'>
                <Mail className='text-muted-foreground h-4 w-4' />
                <span className='text-sm font-medium'>{addr.address}</span>
              </div>
              <div className='flex items-center gap-2'>
                <Badge variant={addr.verified ? 'default' : 'secondary'}>
                  {addr.verified ? 'Verified' : 'Pending'}
                </Badge>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() =>
                    setAddresses((prev) => prev.filter((a) => a.id !== addr.id))
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}

          <div className='flex gap-2'>
            <Input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder='newemail@company.com'
              type='email'
            />
            <Button
              variant='outline'
              onClick={addAddress}
              disabled={!newAddress}
            >
              <Plus className='mr-1 h-4 w-4' />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Reply Settings</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-2'>
            <Label>Reply-from address</Label>
            <Select value={replyFrom} onValueChange={setReplyFrom}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='default'>
                  Default workspace address
                </SelectItem>
                {addresses.map((a) => (
                  <SelectItem key={a.id} value={a.address}>
                    {a.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Auto-reply</p>
              <p className='text-muted-foreground text-xs'>
                Send an automatic acknowledgment when email is received
              </p>
            </div>
            <Switch checked={autoReply} onCheckedChange={setAutoReply} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Forwarding Setup</CardTitle>
          <CardDescription>
            Forward emails from your email provider to process them here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='bg-muted rounded-lg p-4'>
            <p className='mb-2 text-sm font-medium'>
              Forward your support emails to:
            </p>
            <code className='text-primary text-sm'>
              inbox-{'{tenant-id}'}@ingest.support.ai
            </code>
            <p className='text-muted-foreground mt-2 text-xs'>
              Set this as a forwarding address in your email provider (Gmail,
              Outlook, etc.)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button onClick={() => toast.success('Email settings saved')}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
