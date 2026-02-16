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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  Key,
  Lock,
  Mail,
  Monitor,
  Shield,
  X
} from 'lucide-react';
import Link from 'next/link';

export default function SecuritySettingsClient() {
  const [emailAuth, setEmailAuth] = useState(true);
  const [googleSSO, setGoogleSSO] = useState(false);
  const [samlSSO, setSamlSSO] = useState(false);
  const [ipAllowlist, setIpAllowlist] = useState(false);
  const [ipAddresses, setIpAddresses] = useState('');
  const [sessionLength, setSessionLength] = useState('24');
  const [securityEmail, setSecurityEmail] = useState('');
  const [aiTraining, setAiTraining] = useState(true);
  const [enforceSSO, setEnforceSSO] = useState(false);

  function save() {
    toast.success('Security settings saved');
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
          <h2 className='text-lg font-semibold'>Security</h2>
          <p className='text-muted-foreground text-sm'>
            Manage authentication, data protection, and access controls
          </p>
        </div>
      </div>

      <Tabs defaultValue='workspace'>
        <TabsList>
          <TabsTrigger value='workspace'>Workspace</TabsTrigger>
          <TabsTrigger value='data'>Data</TabsTrigger>
          <TabsTrigger value='messenger'>Messenger</TabsTrigger>
          <TabsTrigger value='attachments'>Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value='workspace' className='space-y-4 pt-4'>
          {/* Authentication Methods */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <Key className='h-4 w-4' />
                Authentication Methods
              </CardTitle>
              <CardDescription>
                Choose how teammates sign in to this workspace
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between rounded-lg border p-4'>
                <div className='flex items-center gap-3'>
                  <Mail className='text-muted-foreground h-5 w-5' />
                  <div>
                    <p className='text-sm font-medium'>Email & Password</p>
                    <p className='text-muted-foreground text-xs'>
                      Standard email and password authentication
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='text-green-600'>
                    Active
                  </Badge>
                  <Switch checked={emailAuth} onCheckedChange={setEmailAuth} />
                </div>
              </div>

              <div className='flex items-center justify-between rounded-lg border p-4'>
                <div className='flex items-center gap-3'>
                  <svg
                    className='h-5 w-5'
                    viewBox='0 0 24 24'
                    fill='currentColor'
                  >
                    <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z' />
                    <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
                    <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
                    <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
                  </svg>
                  <div>
                    <p className='text-sm font-medium'>Google SSO</p>
                    <p className='text-muted-foreground text-xs'>
                      Allow teammates to sign in with Google accounts
                    </p>
                  </div>
                </div>
                <Switch checked={googleSSO} onCheckedChange={setGoogleSSO} />
              </div>

              <div className='flex items-center justify-between rounded-lg border p-4'>
                <div className='flex items-center gap-3'>
                  <Shield className='text-muted-foreground h-5 w-5' />
                  <div>
                    <p className='text-sm font-medium'>SAML SSO</p>
                    <p className='text-muted-foreground text-xs'>
                      Enterprise single sign-on with your identity provider
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary'>Enterprise</Badge>
                  <Switch checked={samlSSO} onCheckedChange={setSamlSSO} />
                </div>
              </div>

              {(googleSSO || samlSSO) && (
                <div className='flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950'>
                  <div>
                    <p className='text-sm font-medium'>Enforce SSO</p>
                    <p className='text-muted-foreground text-xs'>
                      Require all teammates to use SSO (disables email/password)
                    </p>
                  </div>
                  <Switch
                    checked={enforceSSO}
                    onCheckedChange={setEnforceSSO}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Contact */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Security Contact</CardTitle>
              <CardDescription>
                Email address for security alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type='email'
                value={securityEmail}
                onChange={(e) => setSecurityEmail(e.target.value)}
                placeholder='security@company.com'
              />
            </CardContent>
          </Card>

          {/* IP Allowlist */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <Lock className='h-4 w-4' />
                IP Allowlist
              </CardTitle>
              <CardDescription>
                Restrict dashboard access to specific IP addresses
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='ip-allowlist'>Enable IP allowlist</Label>
                <Switch
                  id='ip-allowlist'
                  checked={ipAllowlist}
                  onCheckedChange={setIpAllowlist}
                />
              </div>
              {ipAllowlist && (
                <div className='grid gap-2'>
                  <Label htmlFor='ips'>
                    Allowed IP addresses (one per line)
                  </Label>
                  <textarea
                    id='ips'
                    className='border-input bg-background placeholder:text-muted-foreground min-h-[80px] w-full rounded-md border px-3 py-2 text-sm'
                    value={ipAddresses}
                    onChange={(e) => setIpAddresses(e.target.value)}
                    placeholder={'192.168.1.0/24\n10.0.0.1'}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Length */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-base'>
                <Monitor className='h-4 w-4' />
                Session Length
              </CardTitle>
              <CardDescription>
                How long teammates stay signed in before re-authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex items-center gap-3'>
                <Input
                  type='number'
                  min={1}
                  max={720}
                  value={sessionLength}
                  onChange={(e) => setSessionLength(e.target.value)}
                  className='w-24'
                />
                <span className='text-muted-foreground text-sm'>hours</span>
              </div>
            </CardContent>
          </Card>

          {/* AI Training Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>
                AI Model Training Preferences
              </CardTitle>
              <CardDescription>
                Control whether your data is used to improve AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium'>
                    Allow data for model improvement
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    Your conversations may be used to improve AI quality
                  </p>
                </div>
                <Switch checked={aiTraining} onCheckedChange={setAiTraining} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='data' className='space-y-4 pt-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Data Retention</CardTitle>
              <CardDescription>
                Configure how long conversation data is stored
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-2'>
                <Label>Conversation retention period</Label>
                <select className='border-input bg-background w-full rounded-md border px-3 py-2 text-sm'>
                  <option value='30'>30 days</option>
                  <option value='90'>90 days</option>
                  <option value='180'>180 days</option>
                  <option value='365'>1 year</option>
                  <option value='0'>Forever</option>
                </select>
              </div>
              <div className='grid gap-2'>
                <Label>Deleted data grace period</Label>
                <select className='border-input bg-background w-full rounded-md border px-3 py-2 text-sm'>
                  <option value='7'>7 days</option>
                  <option value='30'>30 days</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Data Export</CardTitle>
              <CardDescription>Export all workspace data</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant='outline'>Request Data Export</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base text-red-600'>
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant='destructive'>Delete Workspace</Button>
              <p className='text-muted-foreground mt-2 text-xs'>
                This action is irreversible. All data will be permanently
                deleted.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='messenger' className='space-y-4 pt-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Messenger Security</CardTitle>
              <CardDescription>
                Control security settings for the chat widget
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium'>Identity verification</p>
                  <p className='text-muted-foreground text-xs'>
                    Require HMAC identity verification for logged-in users
                  </p>
                </div>
                <Switch defaultChecked={false} />
              </div>
              <Separator />
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium'>
                    Require email for conversations
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    Users must provide email before starting a chat
                  </p>
                </div>
                <Switch defaultChecked={true} />
              </div>
              <Separator />
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium'>Allow file attachments</p>
                  <p className='text-muted-foreground text-xs'>
                    Users can upload files in conversations
                  </p>
                </div>
                <Switch defaultChecked={true} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='attachments' className='space-y-4 pt-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Attachment Settings</CardTitle>
              <CardDescription>
                Configure allowed file types and size limits
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-2'>
                <Label>Maximum file size (MB)</Label>
                <Input type='number' defaultValue={25} min={1} max={100} />
              </div>
              <div className='grid gap-2'>
                <Label>Blocked file types</Label>
                <Input
                  placeholder='.exe, .bat, .cmd'
                  defaultValue='.exe, .bat, .cmd, .msi'
                />
                <p className='text-muted-foreground text-xs'>
                  Comma-separated list of blocked extensions
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className='flex justify-end'>
        <Button onClick={save}>Save Security Settings</Button>
      </div>
    </div>
  );
}
