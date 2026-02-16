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
import { toast } from 'sonner';
import { Globe, Clock, Languages } from 'lucide-react';

const timezones = [
  'UTC',
  'Europe/Stockholm',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Australia/Sydney'
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'sv', label: 'Svenska' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'ar', label: 'العربية' },
  { value: 'ja', label: '日本語' }
];

export default function WorkspaceGeneralClient() {
  const { tenant, loading } = useTenant();
  const [name, setName] = useState(tenant?.name ?? '');

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
        <h2 className='text-2xl font-bold tracking-tight'>General</h2>
        <p className='text-muted-foreground'>
          Workspace name, timezone, and default language
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Globe className='h-4 w-4' />
            Workspace Details
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>Workspace Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='My Workspace'
            />
          </div>
          <div className='space-y-2'>
            <Label>Workspace ID</Label>
            <Input value={tenant?.$id ?? ''} disabled />
            <p className='text-muted-foreground text-xs'>
              Used in API calls and widget configuration
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Clock className='h-4 w-4' />
            Timezone
          </CardTitle>
          <CardDescription>
            Affects scheduled messages, reports, and SLA calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select defaultValue='Europe/Stockholm'>
            <SelectTrigger className='w-64'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Languages className='h-4 w-4' />
            Default Language
          </CardTitle>
          <CardDescription>
            The primary language used for AI responses and UI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select defaultValue='en'>
            <SelectTrigger className='w-64'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button onClick={() => toast.success('Workspace settings saved')}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
