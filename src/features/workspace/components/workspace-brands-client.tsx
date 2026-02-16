'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Icons } from '@/components/icons';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Palette, Type, Image } from 'lucide-react';

export default function WorkspaceBrandsClient() {
  const { loading } = useTenant();
  const [brandColor, setBrandColor] = useState('#FF6B2C');

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>Brands</h2>
        <p className='text-muted-foreground'>
          Manage brand identity and messaging tone
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Image className='h-4 w-4' />
            Brand Identity
          </CardTitle>
          <CardDescription>
            Logo and colors used across all channels
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>Brand Name</Label>
            <Input placeholder='SWEO' defaultValue='SWEO' />
          </div>
          <div className='space-y-2'>
            <Label>Brand Color</Label>
            <div className='flex items-center gap-3'>
              <input
                type='color'
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className='h-10 w-10 cursor-pointer rounded border'
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className='w-32'
              />
            </div>
            <p className='text-muted-foreground text-xs'>
              Used in chat widget, emails, and messenger
            </p>
          </div>
          <Separator />
          <div className='space-y-2'>
            <Label>Logo</Label>
            <div className='flex items-center gap-4'>
              <div className='bg-muted flex h-16 w-32 items-center justify-center rounded-md border'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src='/logo_sweo.svg?v=2'
                  alt='Logo'
                  className='h-8 w-auto'
                />
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => toast.info('Logo upload coming soon')}
              >
                Upload New Logo
              </Button>
            </div>
          </div>
          <div className='space-y-2'>
            <Label>Favicon</Label>
            <div className='flex items-center gap-4'>
              <div className='bg-muted flex h-10 w-10 items-center justify-center rounded-md border'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src='/logo_sweo.svg?v=2'
                  alt='Favicon'
                  className='h-5 w-5'
                />
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => toast.info('Favicon upload coming soon')}
              >
                Upload Favicon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Type className='h-4 w-4' />
            Messaging Tone
          </CardTitle>
          <CardDescription>
            Define how your AI assistant communicates
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>Tone of voice</Label>
            <Select defaultValue='professional'>
              <SelectTrigger className='w-64'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='friendly'>Friendly & Casual</SelectItem>
                <SelectItem value='professional'>Professional</SelectItem>
                <SelectItem value='formal'>Formal & Corporate</SelectItem>
                <SelectItem value='playful'>Playful & Fun</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label>Company description (for AI context)</Label>
            <textarea
              className='border-input bg-background min-h-[80px] w-full rounded-md border px-3 py-2 text-sm'
              placeholder='We are a customer support platform that helps businesses automate their support with AI...'
            />
            <p className='text-muted-foreground text-xs'>
              This is included in AI system prompts for better context
            </p>
          </div>
          <div className='space-y-2'>
            <Label>Custom instructions</Label>
            <textarea
              className='border-input bg-background min-h-[80px] w-full rounded-md border px-3 py-2 text-sm'
              placeholder='Always greet the customer by name. Never mention competitor products...'
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Palette className='h-4 w-4' />
            Widget Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>Widget position</Label>
            <Select defaultValue='bottom-right'>
              <SelectTrigger className='w-64'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='bottom-right'>Bottom Right</SelectItem>
                <SelectItem value='bottom-left'>Bottom Left</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label>Welcome message</Label>
            <Input
              placeholder='Hi there! How can we help you today?'
              defaultValue='Hi there! How can we help you today?'
            />
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button onClick={() => toast.success('Brand settings saved')}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
