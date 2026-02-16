'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowRight,
  Bot,
  Brain,
  FileText,
  Globe,
  MessageSquare,
  Pen,
  Plus,
  Settings,
  Sparkles,
  Target,
  Zap
} from 'lucide-react';
import Link from 'next/link';

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

const mockRules: AutomationRule[] = [
  {
    id: '1',
    name: 'Auto-assign billing questions',
    trigger: 'When topic contains "billing" or "invoice"',
    action: 'Assign to Billing team inbox',
    enabled: true
  },
  {
    id: '2',
    name: 'Close inactive conversations',
    trigger: 'When no reply for 48 hours',
    action: 'Close conversation and send follow-up',
    enabled: true
  },
  {
    id: '3',
    name: 'Escalate negative sentiment',
    trigger: 'When AI detects negative sentiment',
    action: 'Escalate to human agent',
    enabled: false
  }
];

export default function AIAutomationPageClient() {
  const { tenant, loading } = useTenant();
  const [rules, setRules] = useState<AutomationRule[]>(mockRules);
  const [finEnabled, setFinEnabled] = useState(true);
  const [autoCompose, setAutoCompose] = useState(true);
  const [autoSummarize, setAutoSummarize] = useState(true);
  const [autofill, setAutofill] = useState(true);
  const [aiArticles, setAiArticles] = useState(true);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='space-y-6 pb-8'>
      <Tabs defaultValue='fin' className='pt-4'>
        <TabsList>
          <TabsTrigger value='fin'>
            <Bot className='mr-1.5 h-4 w-4' />
            SWEO AI Agent
          </TabsTrigger>
          <TabsTrigger value='inbox-ai'>
            <Sparkles className='mr-1.5 h-4 w-4' />
            Inbox AI
          </TabsTrigger>
          <TabsTrigger value='automation'>
            <Zap className='mr-1.5 h-4 w-4' />
            Automation
          </TabsTrigger>
        </TabsList>

        {/* ── SWEO AI Agent Tab ── */}
        <TabsContent value='fin' className='pt-4'>
          <div className='space-y-5'>
            {/* Status & Metrics */}
            <Card>
              <CardHeader className='pb-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='bg-muted flex h-10 w-10 items-center justify-center rounded-md'>
                      <Bot className='h-5 w-5' />
                    </div>
                    <div>
                      <CardTitle className='text-base'>SWEO AI Agent</CardTitle>
                      <CardDescription>
                        Autonomous customer support agent
                      </CardDescription>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <Badge variant={finEnabled ? 'default' : 'secondary'}>
                      {finEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                    <Switch
                      checked={finEnabled}
                      onCheckedChange={setFinEnabled}
                    />
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className='pt-4'>
                <div className='grid gap-6 sm:grid-cols-3'>
                  <div>
                    <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                      Resolution Rate
                    </p>
                    <p className='mt-1 text-2xl font-semibold tabular-nums'>
                      78%
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                      Avg Response Time
                    </p>
                    <p className='mt-1 text-2xl font-semibold tabular-nums'>
                      1.2s
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                      Customer Satisfaction
                    </p>
                    <p className='mt-1 text-2xl font-semibold tabular-nums'>
                      4.8/5
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Brain className='h-4 w-4' />
                  Personality &amp; Behavior
                </CardTitle>
                <CardDescription>
                  Define how the AI agent communicates with customers
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='fin-name'>Agent Name</Label>
                    <Input id='fin-name' defaultValue='SWEO' />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='fin-tone'>Tone of Voice</Label>
                    <Select defaultValue='professional'>
                      <SelectTrigger id='fin-tone'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='professional'>
                          Professional
                        </SelectItem>
                        <SelectItem value='friendly'>Friendly</SelectItem>
                        <SelectItem value='casual'>Casual</SelectItem>
                        <SelectItem value='formal'>Formal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='fin-instructions'>Custom Instructions</Label>
                  <Textarea
                    id='fin-instructions'
                    rows={3}
                    placeholder='Add specific instructions for how the agent should behave...'
                    defaultValue='Always be helpful and concise. If unsure, escalate to a human agent.'
                  />
                  <p className='text-muted-foreground text-xs'>
                    These instructions are prepended to every AI conversation as
                    system context.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Active Channels */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Globe className='h-4 w-4' />
                  Active Channels
                </CardTitle>
                <CardDescription>
                  Channels where the AI agent responds to queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='divide-y'>
                  {[
                    { name: 'Messenger (Web)', icon: MessageSquare, on: true },
                    { name: 'Email', icon: FileText, on: true },
                    { name: 'WhatsApp', icon: MessageSquare, on: false },
                    { name: 'SMS', icon: MessageSquare, on: false }
                  ].map((ch) => {
                    const Icon = ch.icon;
                    return (
                      <div
                        key={ch.name}
                        className='flex items-center justify-between py-3'
                      >
                        <div className='flex items-center gap-2'>
                          <Icon className='text-muted-foreground h-4 w-4' />
                          <span className='text-sm'>{ch.name}</span>
                        </div>
                        <Switch defaultChecked={ch.on} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Knowledge & Training */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Target className='h-4 w-4' />
                  Knowledge &amp; Training
                </CardTitle>
                <CardDescription>
                  Data sources and workflows the agent uses to resolve queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='divide-y'>
                  <Link
                    href='/dashboard/knowledge'
                    className='hover:bg-muted/50 flex items-center justify-between py-3 transition-colors'
                  >
                    <div className='flex items-center gap-3'>
                      <FileText className='text-muted-foreground h-4 w-4' />
                      <div>
                        <p className='text-sm font-medium'>Knowledge Base</p>
                        <p className='text-muted-foreground text-xs'>
                          Articles, URLs, and uploaded documents
                        </p>
                      </div>
                    </div>
                    <ArrowRight className='text-muted-foreground h-4 w-4' />
                  </Link>
                  <Link
                    href='/dashboard/procedures'
                    className='hover:bg-muted/50 flex items-center justify-between py-3 transition-colors'
                  >
                    <div className='flex items-center gap-3'>
                      <Zap className='text-muted-foreground h-4 w-4' />
                      <div>
                        <p className='text-sm font-medium'>Procedures</p>
                        <p className='text-muted-foreground text-xs'>
                          Multi-step workflows the agent can execute
                        </p>
                      </div>
                    </div>
                    <ArrowRight className='text-muted-foreground h-4 w-4' />
                  </Link>
                  <Link
                    href='/dashboard/policies'
                    className='hover:bg-muted/50 flex items-center justify-between py-3 transition-colors'
                  >
                    <div className='flex items-center gap-3'>
                      <Settings className='text-muted-foreground h-4 w-4' />
                      <div>
                        <p className='text-sm font-medium'>Policies</p>
                        <p className='text-muted-foreground text-xs'>
                          Content filters and response guardrails
                        </p>
                      </div>
                    </div>
                    <ArrowRight className='text-muted-foreground h-4 w-4' />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className='flex justify-end pt-2'>
            <Button
              onClick={() => toast.success('SWEO AI Agent settings saved')}
            >
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* ── Inbox AI Tab ── */}
        <TabsContent value='inbox-ai' className='pt-4'>
          <div className='space-y-5'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Sparkles className='h-4 w-4' />
                  Inbox AI Features
                </CardTitle>
                <CardDescription>
                  AI-powered tools to help agents work faster
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='divide-y'>
                  <div className='flex items-center justify-between py-4'>
                    <div className='flex items-center gap-3'>
                      <Pen className='text-muted-foreground h-4 w-4' />
                      <div>
                        <p className='text-sm font-medium'>AI Compose</p>
                        <p className='text-muted-foreground text-xs'>
                          Generate reply drafts based on conversation context
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={autoCompose}
                      onCheckedChange={setAutoCompose}
                    />
                  </div>

                  <div className='flex items-center justify-between py-4'>
                    <div className='flex items-center gap-3'>
                      <FileText className='text-muted-foreground h-4 w-4' />
                      <div>
                        <p className='text-sm font-medium'>AI Summarize</p>
                        <p className='text-muted-foreground text-xs'>
                          Automatically summarize long conversations
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={autoSummarize}
                      onCheckedChange={setAutoSummarize}
                    />
                  </div>

                  <div className='flex items-center justify-between py-4'>
                    <div className='flex items-center gap-3'>
                      <Sparkles className='text-muted-foreground h-4 w-4' />
                      <div>
                        <p className='text-sm font-medium'>Autofill</p>
                        <p className='text-muted-foreground text-xs'>
                          Auto-fill conversation attributes from context
                        </p>
                      </div>
                    </div>
                    <Switch checked={autofill} onCheckedChange={setAutofill} />
                  </div>

                  <div className='flex items-center justify-between py-4'>
                    <div className='flex items-center gap-3'>
                      <FileText className='text-muted-foreground h-4 w-4' />
                      <div>
                        <p className='text-sm font-medium'>AI Articles</p>
                        <p className='text-muted-foreground text-xs'>
                          Suggest relevant knowledge articles to agents
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={aiArticles}
                      onCheckedChange={setAiArticles}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className='flex justify-end pt-2'>
            <Button onClick={() => toast.success('Inbox AI settings saved')}>
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* ── Automation Tab ── */}
        <TabsContent value='automation' className='space-y-5 pt-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-sm font-semibold'>Automation Rules</h3>
              <p className='text-muted-foreground text-xs'>
                Automate repetitive tasks and routing
              </p>
            </div>
            <Button size='sm' variant='outline'>
              <Plus className='mr-1.5 h-3.5 w-3.5' />
              New Rule
            </Button>
          </div>

          <Card>
            <CardContent className='p-0'>
              <div className='divide-y'>
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className='flex items-center justify-between px-4 py-4'
                  >
                    <div className='space-y-0.5'>
                      <p className='text-sm font-medium'>{rule.name}</p>
                      <p className='text-muted-foreground text-xs'>
                        {rule.trigger}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        &rarr; {rule.action}
                      </p>
                    </div>
                    <div className='flex items-center gap-3'>
                      <Badge
                        variant={rule.enabled ? 'default' : 'secondary'}
                        className='text-[10px]'
                      >
                        {rule.enabled ? 'Active' : 'Paused'}
                      </Badge>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(v) =>
                          setRules((prev) =>
                            prev.map((r) =>
                              r.id === rule.id ? { ...r, enabled: v } : r
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
