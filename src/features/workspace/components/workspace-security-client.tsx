'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Shield, Key, Globe, Clock } from 'lucide-react';

export default function WorkspaceSecurityClient() {
  const { loading } = useTenant();
  const [twoFactor, setTwoFactor] = useState(false);
  const [sso, setSso] = useState(false);
  const [ipAllowlist, setIpAllowlist] = useState(false);

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
        <h2 className='text-2xl font-bold tracking-tight'>Security</h2>
        <p className='text-muted-foreground'>
          Authentication methods, IP allowlists, and session settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Key className='h-4 w-4' />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>
                Two-factor authentication (2FA)
              </p>
              <p className='text-muted-foreground text-xs'>
                Require 2FA for all workspace members
              </p>
            </div>
            <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Single Sign-On (SSO)</p>
              <p className='text-muted-foreground text-xs'>
                Enable SAML 2.0 SSO for enterprise authentication
              </p>
            </div>
            <Switch checked={sso} onCheckedChange={setSso} />
          </div>
          {sso && (
            <div className='space-y-3 rounded-md border p-4'>
              <div className='space-y-2'>
                <Label>SSO Provider URL</Label>
                <Input placeholder='https://idp.example.com/saml2' />
              </div>
              <div className='space-y-2'>
                <Label>Entity ID</Label>
                <Input placeholder='urn:example:idp' />
              </div>
              <div className='space-y-2'>
                <Label>Certificate (X.509)</Label>
                <Input placeholder='Paste certificate...' />
              </div>
            </div>
          )}
          <Separator />
          <div className='space-y-2'>
            <Label>Password Policy</Label>
            <Select defaultValue='strong'>
              <SelectTrigger className='w-64'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='basic'>Basic (min 8 characters)</SelectItem>
                <SelectItem value='strong'>
                  Strong (min 12, mixed case, numbers)
                </SelectItem>
                <SelectItem value='enterprise'>
                  Enterprise (min 16, special characters)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Globe className='h-4 w-4' />
            IP Allowlist
          </CardTitle>
          <CardDescription>
            Restrict workspace access to specific IP addresses
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Enable IP allowlist</p>
              <p className='text-muted-foreground text-xs'>
                Only allow access from listed IP addresses
              </p>
            </div>
            <Switch checked={ipAllowlist} onCheckedChange={setIpAllowlist} />
          </div>
          {ipAllowlist && (
            <div className='space-y-2'>
              <Label>Allowed IPs (one per line)</Label>
              <textarea
                className='border-input bg-background min-h-[80px] w-full rounded-md border px-3 py-2 text-sm'
                placeholder={'192.168.1.0/24\n10.0.0.1'}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Clock className='h-4 w-4' />
            Session Settings
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>Session timeout</Label>
            <Select defaultValue='24h'>
              <SelectTrigger className='w-64'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='1h'>1 hour</SelectItem>
                <SelectItem value='8h'>8 hours</SelectItem>
                <SelectItem value='24h'>24 hours</SelectItem>
                <SelectItem value='7d'>7 days</SelectItem>
                <SelectItem value='30d'>30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className='space-y-2'>
            <Label>Max concurrent sessions</Label>
            <Select defaultValue='5'>
              <SelectTrigger className='w-64'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='1'>1 session</SelectItem>
                <SelectItem value='3'>3 sessions</SelectItem>
                <SelectItem value='5'>5 sessions</SelectItem>
                <SelectItem value='unlimited'>Unlimited</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button onClick={() => toast.success('Security settings saved')}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
