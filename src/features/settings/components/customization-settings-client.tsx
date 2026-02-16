'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import {
  ArrowLeft,
  Palette,
  Type,
  Link as LinkIcon,
  Globe
} from 'lucide-react';
import Link from 'next/link';

export default function CustomizationSettingsClient() {
  const { tenant, loading } = useTenant();
  const [greeting, setGreeting] = useState('Hi there! How can we help?');
  const [botName, setBotName] = useState('Fin');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [position, setPosition] = useState<'right' | 'left'>('right');
  const [universalLinks, setUniversalLinks] = useState(true);
  const [customDomain, setCustomDomain] = useState('');

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3'>
        <Link
          href='/dashboard/settings'
          className='text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='h-5 w-5' />
        </Link>
        <div>
          <h2 className='text-lg font-semibold'>Brands & Customization</h2>
          <p className='text-muted-foreground text-sm'>
            Customize how your support brand looks and feels
          </p>
        </div>
      </div>

      {/* Messenger Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Palette className='h-4 w-4' />
            Messenger Appearance
          </CardTitle>
          <CardDescription>
            Customize the look of your chat messenger
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='bot-name'>Bot Name</Label>
            <Input
              id='bot-name'
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder='Fin'
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='greeting'>Welcome Message</Label>
            <Textarea
              id='greeting'
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              rows={3}
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='color'>Brand Color</Label>
            <div className='flex items-center gap-3'>
              <input
                type='color'
                id='color'
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className='h-10 w-10 cursor-pointer rounded border'
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className='w-32'
              />
            </div>
          </div>

          <div className='grid gap-2'>
            <Label>Widget Position</Label>
            <Select
              value={position}
              onValueChange={(v) => setPosition(v as 'right' | 'left')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='right'>Bottom Right</SelectItem>
                <SelectItem value='left'>Bottom Left</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Live Preview */}
          <div className='rounded-lg border p-4'>
            <p className='text-muted-foreground mb-3 text-xs font-medium'>
              Preview
            </p>
            <div className='bg-muted relative rounded-lg p-6'>
              <div
                className={`absolute bottom-4 ${position === 'right' ? 'right-4' : 'left-4'} flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg`}
                style={{ backgroundColor: primaryColor }}
              >
                <svg
                  className='h-6 w-6'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' />
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Settings */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Type className='h-4 w-4' />
            Message Settings
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Show "Powered by" badge</p>
              <p className='text-muted-foreground text-xs'>
                Display branding in the messenger
              </p>
            </div>
            <Switch defaultChecked={true} />
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Typing indicators</p>
              <p className='text-muted-foreground text-xs'>
                Show when AI or agents are typing
              </p>
            </div>
            <Switch defaultChecked={true} />
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Read receipts</p>
              <p className='text-muted-foreground text-xs'>
                Show when messages have been read
              </p>
            </div>
            <Switch defaultChecked={false} />
          </div>
        </CardContent>
      </Card>

      {/* Domain Management */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Globe className='h-4 w-4' />
            Domain Management
          </CardTitle>
          <CardDescription>
            Configure a custom domain for your help center
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Universal Linking</p>
              <p className='text-muted-foreground text-xs'>
                Auto-link knowledge articles in responses
              </p>
            </div>
            <Switch
              checked={universalLinks}
              onCheckedChange={setUniversalLinks}
            />
          </div>
          <Separator />
          <div className='grid gap-2'>
            <Label htmlFor='custom-domain'>Custom Domain</Label>
            <Input
              id='custom-domain'
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder='help.yourcompany.com'
            />
            <p className='text-muted-foreground text-xs'>
              Point a CNAME record to support.yourdomain.com
            </p>
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button onClick={() => toast.success('Customization saved')}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
