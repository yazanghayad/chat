'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { ArrowLeft, Building2 } from 'lucide-react';
import Link from 'next/link';

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Stockholm',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'sv', label: 'Svenska' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'ja', label: '日本語' }
];

export default function GeneralSettingsClient() {
  const { tenant, loading } = useTenant();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');
  const [subdomain, setSubdomain] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name ?? '');
      const cfg = (tenant.config ?? {}) as Record<string, unknown>;
      setTimezone((cfg.timezone as string) ?? 'UTC');
      setLanguage((cfg.language as string) ?? 'en');
      setSubdomain((cfg.subdomain as string) ?? '');
    }
  }, [tenant]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/tenant/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, timezone, language, subdomain })
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [name, timezone, language, subdomain]);

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
          <h2 className='text-lg font-semibold'>General</h2>
          <p className='text-muted-foreground text-sm'>
            Manage workspace name, timezone, and default language
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Building2 className='h-4 w-4' />
            Workspace Details
          </CardTitle>
          <CardDescription>
            Basic information about your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>Workspace Name</Label>
            <Input
              id='name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='My Company'
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='subdomain'>Subdomain</Label>
            <div className='flex items-center gap-2'>
              <Input
                id='subdomain'
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder='my-company'
              />
              <span className='text-muted-foreground text-sm'>.support.ai</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Locale Settings</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='timezone'>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id='timezone'>
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
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='language'>Default Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id='language'>
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
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button disabled={saving} onClick={save}>
          {saving && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
