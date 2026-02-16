'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import type {
  Tenant,
  TenantConfig,
  ConversationChannel
} from '@/types/appwrite';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { WidgetInstall } from './widget-install';

const ALL_CHANNELS: ConversationChannel[] = [
  'web',
  'email',
  'whatsapp',
  'sms',
  'voice'
];

export default function SettingsPageClient() {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const [config, setConfig] = useState<TenantConfig>({});
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);

  useEffect(() => {
    if (tenant) {
      const cfg = (tenant.config ?? {}) as TenantConfig;
      setConfig({
        channels: cfg.channels ?? ['web'],
        model: cfg.model ?? 'gpt-4o',
        confidenceThreshold: cfg.confidenceThreshold ?? 0.7,
        maxHistoryMessages: cfg.maxHistoryMessages ?? 10,
        customSystemPrompt: cfg.customSystemPrompt ?? '',
        webhookUrl: cfg.webhookUrl ?? '',
        cacheTtlSeconds: cfg.cacheTtlSeconds ?? 3600
      });
      setApiKey(tenant.apiKey ?? '');
    }
  }, [tenant]);

  const saveSettings = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/tenant/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save');
      }
      toast.success('Settings saved');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save settings'
      );
    } finally {
      setSaving(false);
    }
  }, [config]);

  const rotateApiKey = useCallback(async () => {
    if (
      !confirm(
        'Rotate API key? The current key will remain valid for 24 hours.'
      )
    )
      return;
    setRotatingKey(true);
    try {
      const res = await fetch('/api/tenant/api-key', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to rotate key');
      const data = await res.json();
      setApiKey(data.apiKey);
      toast.success('API key rotated. Old key valid for 24h.');
    } catch {
      toast.error('Failed to rotate API key');
    } finally {
      setRotatingKey(false);
    }
  }, []);

  function toggleChannel(ch: ConversationChannel) {
    setConfig((prev) => {
      const current = prev.channels ?? [];
      const next = current.includes(ch)
        ? current.filter((c) => c !== ch)
        : [...current, ch];
      return { ...prev, channels: next };
    });
  }

  if (tenantLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (tenantError || !tenant) {
    return (
      <div className='text-destructive py-20 text-center'>
        {tenantError ?? 'Could not load tenant'}
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Tenant Info */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Tenant</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2 text-sm'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>Name</span>
            <span className='font-medium'>{tenant.name}</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>Plan</span>
            <Badge variant='outline'>
              {tenant.plan?.charAt(0).toUpperCase() + tenant.plan?.slice(1)}
            </Badge>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>Tenant ID</span>
            <code className='text-muted-foreground text-xs'>{tenant.$id}</code>
          </div>
        </CardContent>
      </Card>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>API Key</CardTitle>
          <CardDescription>
            Use this key to authenticate widget and webhook requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-2'>
            <Input
              readOnly
              value={apiKey}
              className='font-mono text-xs'
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                navigator.clipboard.writeText(apiKey);
                toast.success('Copied');
              }}
            >
              Copy
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant='destructive'
            size='sm'
            disabled={rotatingKey}
            onClick={rotateApiKey}
          >
            {rotatingKey && (
              <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
            )}
            Rotate Key
          </Button>
        </CardFooter>
      </Card>

      {/* AI Model Settings */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>AI Configuration</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='model'>Model</Label>
            <Select
              value={config.model ?? 'gpt-4o'}
              onValueChange={(v) => setConfig((p) => ({ ...p, model: v }))}
            >
              <SelectTrigger id='model'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='gpt-4o'>GPT-4o</SelectItem>
                <SelectItem value='gpt-4o-mini'>GPT-4o Mini</SelectItem>
                <SelectItem value='gpt-4.1'>GPT-4.1</SelectItem>
                <SelectItem value='gpt-4.1-mini'>GPT-4.1 Mini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='confidence'>
              Confidence Threshold (
              {((config.confidenceThreshold ?? 0.7) * 100).toFixed(0)}%)
            </Label>
            <Input
              id='confidence'
              type='range'
              min={0}
              max={1}
              step={0.05}
              value={config.confidenceThreshold ?? 0.7}
              onChange={(e) =>
                setConfig((p) => ({
                  ...p,
                  confidenceThreshold: parseFloat(e.target.value)
                }))
              }
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='history'>Max History Messages</Label>
            <Input
              id='history'
              type='number'
              min={1}
              max={50}
              value={config.maxHistoryMessages ?? 10}
              onChange={(e) =>
                setConfig((p) => ({
                  ...p,
                  maxHistoryMessages: parseInt(e.target.value) || 10
                }))
              }
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='prompt'>Custom System Prompt</Label>
            <Textarea
              id='prompt'
              rows={4}
              placeholder='Optional: customize how the AI responds...'
              value={config.customSystemPrompt ?? ''}
              onChange={(e) =>
                setConfig((p) => ({ ...p, customSystemPrompt: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Enabled Channels</CardTitle>
          <CardDescription>
            Toggle which channels the AI agent responds on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {ALL_CHANNELS.map((ch) => (
              <div key={ch} className='flex items-center justify-between'>
                <Label htmlFor={`ch-${ch}`} className='capitalize'>
                  {ch}
                </Label>
                <Switch
                  id={`ch-${ch}`}
                  checked={config.channels?.includes(ch) ?? false}
                  onCheckedChange={() => toggleChannel(ch)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Advanced</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='webhook'>Webhook URL</Label>
            <Input
              id='webhook'
              type='url'
              placeholder='https://...'
              value={config.webhookUrl ?? ''}
              onChange={(e) =>
                setConfig((p) => ({ ...p, webhookUrl: e.target.value }))
              }
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='cache'>Cache TTL (seconds)</Label>
            <Input
              id='cache'
              type='number'
              min={0}
              value={config.cacheTtlSeconds ?? 3600}
              onChange={(e) =>
                setConfig((p) => ({
                  ...p,
                  cacheTtlSeconds: parseInt(e.target.value) || 3600
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Widget Embed */}
      <WidgetInstall
        apiKey={apiKey}
        apiUrl={typeof window !== 'undefined' ? window.location.origin : ''}
      />

      <Separator />

      <div className='flex justify-end'>
        <Button disabled={saving} onClick={saveSettings}>
          {saving && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
