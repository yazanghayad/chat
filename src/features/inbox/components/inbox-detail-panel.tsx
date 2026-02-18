'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getConversationAction } from '@/features/conversation/actions/conversation-crud';
import type { Conversation } from '@/types/appwrite';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Bot,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Globe,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Minus,
  Pencil,
  Plus,
  Maximize2,
  Send,
  Sparkles,
  Tags,
  Trash2,
  User,
  Users,
  X
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/format';

/* ═══════════ Types ═══════════ */
interface InboxDetailPanelProps {
  conversationId: string;
  tenantId: string;
  conversationMessages?: Array<{ role: string; content: string }>;
}

interface LinkItem {
  id: string;
  label: string;
  url: string;
}

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/* ═══════════ Collapsible Section ═══════════ */
function DetailSection({
  title,
  icon: Icon,
  defaultOpen = false,
  onAdd,
  children
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className='flex items-center justify-between pr-1'>
        <CollapsibleTrigger asChild>
          <button className='hover:bg-accent/50 flex flex-1 items-center justify-between px-3 py-2 transition-colors'>
            <span className='flex items-center gap-2 text-xs font-medium'>
              {Icon && <Icon className='h-3.5 w-3.5' />}
              {title}
            </span>
            {open ? (
              <ChevronUp className='text-muted-foreground h-3.5 w-3.5' />
            ) : (
              <ChevronDown className='text-muted-foreground h-3.5 w-3.5' />
            )}
          </button>
        </CollapsibleTrigger>
        {onAdd && (
          <Button
            variant='ghost'
            size='icon'
            className='h-5 w-5 shrink-0'
            onClick={onAdd}
          >
            <Plus className='h-3 w-3' />
          </Button>
        )}
      </div>
      <CollapsibleContent>
        <div className='px-3 pb-2'>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ═══════════ Editable Attribute Row ═══════════ */
function EditableRow({
  label,
  value,
  onSave,
  placeholder = 'Click to edit...'
}: {
  label: string;
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function handleSave() {
    onSave(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className='flex items-center gap-1 py-1'>
        <span className='text-muted-foreground w-20 shrink-0 text-[11px]'>
          {label}
        </span>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setEditing(false);
          }}
          onBlur={handleSave}
          autoFocus
          className='h-6 flex-1 text-[11px]'
        />
      </div>
    );
  }

  return (
    <div
      className='hover:bg-accent/30 flex cursor-pointer items-center justify-between rounded py-1 transition-colors'
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      <span className='text-muted-foreground text-[11px]'>{label}</span>
      <span className='text-[11px] font-medium'>
        {value || (
          <span className='text-muted-foreground italic'>{placeholder}</span>
        )}
      </span>
    </div>
  );
}

/* ═══════════ Removable Badge ═══════════ */
function RemovableBadge({
  label,
  onRemove
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Badge variant='secondary' className='gap-0.5 text-[10px]'>
      {label}
      <button
        onClick={onRemove}
        className='hover:text-destructive ml-0.5 rounded-sm'
      >
        <X className='h-2.5 w-2.5' />
      </button>
    </Badge>
  );
}

/* ═══════════ Add Item Popover ═══════════ */
function AddItemPopover({
  placeholder,
  onAdd,
  children
}: {
  placeholder: string;
  onAdd: (value: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  function handleAdd() {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className='w-56 p-2' side='left' align='start'>
        <div className='flex items-center gap-1'>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className='h-7 flex-1 text-xs'
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
          />
          <Button size='icon' className='h-7 w-7 shrink-0' onClick={handleAdd}>
            <Plus className='h-3 w-3' />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ═══════════ Link Row ═══════════ */
function InteractiveLinkRow({
  label,
  links,
  onAdd,
  onRemove
}: {
  label: string;
  links: LinkItem[];
  onAdd: (url: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between'>
        <span className='text-[11px]'>{label}</span>
        <AddItemPopover placeholder='Paste URL...' onAdd={onAdd}>
          <Button variant='ghost' size='icon' className='h-5 w-5'>
            <Plus className='h-3 w-3' />
          </Button>
        </AddItemPopover>
      </div>
      {links.map((link) => (
        <div
          key={link.id}
          className='bg-muted/50 flex items-center gap-1.5 rounded px-2 py-1'
        >
          <Globe className='text-muted-foreground h-3 w-3 shrink-0' />
          <a
            href={link.url}
            target='_blank'
            rel='noopener noreferrer'
            className='text-primary flex-1 truncate text-[10px] underline'
          >
            {link.url}
          </a>
          <button
            onClick={() => onRemove(link.id)}
            className='text-muted-foreground hover:text-destructive'
          >
            <Trash2 className='h-3 w-3' />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ═══════════ AI Copilot Chat ═══════════ */
function CopilotChat({
  conversationContext
}: {
  conversationContext?: {
    channel?: string;
    status?: string;
    messages?: Array<{ role: string; content: string }>;
  };
}) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Get the last customer message for context-aware actions */
  const lastCustomerMsg = conversationContext?.messages
    ?.filter((m) => m.role === 'user')
    .at(-1)?.content;

  const quickActions = [
    {
      label: 'Summarize',
      prompt: 'Summarize this conversation concisely.'
    },
    {
      label: 'Translate to English',
      prompt: lastCustomerMsg
        ? `Translate this customer message to English:\n\n"${lastCustomerMsg}"`
        : 'Translate the last customer message to English.'
    },
    {
      label: 'Translate to Swedish',
      prompt: lastCustomerMsg
        ? `Translate this customer message to Swedish:\n\n"${lastCustomerMsg}"`
        : 'Translate the last customer message to Swedish.'
    },
    {
      label: 'Suggest Reply',
      prompt: lastCustomerMsg
        ? `The customer wrote:\n\n"${lastCustomerMsg}"\n\nSuggest a professional reply.`
        : 'Suggest a professional reply to the customer based on this conversation.'
    },
    {
      label: 'Analyze Sentiment',
      prompt:
        'Analyze the sentiment and CX score of this conversation. Give a score from 1-10 and explain.'
    },
    {
      label: 'Draft Note',
      prompt:
        'Draft an internal note for the team summarizing the key issue and next steps.'
    }
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(content: string) {
    if (!content.trim() || streaming) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: content.trim()
    };

    const assistantMsg: CopilotMessage = {
      id: `ast-${Date.now()}`,
      role: 'assistant',
      content: ''
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content
          })),
          conversationContext
        })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: fullContent } : m
                )
              );
            }
          } catch {
            // skip
          }
        }
      }
    } catch (error) {
      console.error('Copilot error:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? {
                ...m,
                content:
                  'Sorry, I encountered an error. Please check that the NVIDIA API is configured correctly.'
              }
            : m
        )
      );
      toast.error('Failed to get AI response');
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      {/* Quick actions */}
      {messages.length === 0 && (
        <div className='space-y-3 p-3'>
          <div className='text-center'>
            <div className='bg-primary/10 text-primary mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full'>
              <Sparkles className='h-5 w-5' />
            </div>
            <p className='text-xs font-medium'>AI Copilot</p>
            <p className='text-muted-foreground mt-0.5 text-[10px]'>
              Your AI assistant for this conversation
            </p>
          </div>
          <div className='space-y-1'>
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.prompt)}
                className='hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors'
              >
                <Sparkles className='text-primary h-3 w-3 shrink-0' />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <ScrollArea className='flex-1 p-3' ref={scrollRef}>
          <div className='space-y-3'>
            {messages.map((msg) => (
              <div key={msg.id} className='flex gap-2'>
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    msg.role === 'user'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {msg.role === 'user' ? (
                    <User className='h-3 w-3' />
                  ) : (
                    <Sparkles className='h-3 w-3' />
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <span className='text-[10px] font-medium'>
                    {msg.role === 'user' ? 'You' : 'Copilot'}
                  </span>
                  <div className='prose prose-sm dark:prose-invert mt-0.5 max-w-none'>
                    <p className='text-[11px] leading-relaxed whitespace-pre-wrap'>
                      {msg.content ||
                        (streaming && msg.role === 'assistant' ? (
                          <span className='text-muted-foreground flex items-center gap-1'>
                            <Loader2 className='h-3 w-3 animate-spin' />
                            Thinking...
                          </span>
                        ) : null)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Input */}
      <div className='border-t p-2'>
        {messages.length > 0 && (
          <div className='mb-2 flex flex-wrap gap-1'>
            {quickActions.slice(0, 3).map((action) => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.prompt)}
                disabled={streaming}
                className='bg-muted hover:bg-accent rounded-full px-2 py-0.5 text-[9px] transition-colors disabled:opacity-50'
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
        <div className='flex items-center gap-1'>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Ask Copilot...'
            className='h-7 flex-1 text-xs'
            disabled={streaming}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <Button
            size='icon'
            className='h-7 w-7 shrink-0'
            disabled={!input.trim() || streaming}
            onClick={() => sendMessage(input)}
          >
            {streaming ? (
              <Loader2 className='h-3 w-3 animate-spin' />
            ) : (
              <Send className='h-3 w-3' />
            )}
          </Button>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className='text-muted-foreground hover:text-foreground mt-1 text-[10px] transition-colors'
          >
            Clear chat
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export function InboxDetailPanel({
  conversationId,
  tenantId,
  conversationMessages
}: InboxDetailPanelProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  /* Editable state */
  const [assignee, setAssignee] = useState('Yazan Ghayad');
  const [teamInbox, setTeamInbox] = useState('Unassigned');
  const [aiTitle, setAiTitle] = useState('');
  const [company, setCompany] = useState('[Demo]');
  const [brand, setBrand] = useState('OptiTech Sverige AB');
  const [subject, setSubject] = useState('');
  const [cxRating, setCxRating] = useState('');
  const [cxExplanation, setCxExplanation] = useState('');

  /* Collections */
  const [trackerLinks, setTrackerLinks] = useState<LinkItem[]>([]);
  const [backofficeLinks, setBackofficeLinks] = useState<LinkItem[]>([]);
  const [sideConvos, setSideConvos] = useState<LinkItem[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getConversationAction(conversationId, tenantId);
    if (res.success && res.conversation) {
      setConversation(res.conversation as Conversation);
    }
    setLoading(false);
  }, [conversationId, tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  /* Set AI title from conversation */
  useEffect(() => {
    setAiTitle(conversation?.userId ?? 'Unknown');
  }, [conversationId, conversation]);

  /* Copilot context */
  const channelKey = conversation?.channel ?? 'web';
  const copilotContext = {
    channel: channelKey,
    status: conversation?.status ?? 'active',
    messages: conversationMessages ?? []
  };

  if (loading) {
    return (
      <div className='flex w-72 items-center justify-center border-l'>
        <Icons.spinner className='text-muted-foreground h-5 w-5 animate-spin' />
      </div>
    );
  }

  function addLink(
    setter: React.Dispatch<React.SetStateAction<LinkItem[]>>,
    url: string
  ) {
    setter((prev) => [...prev, { id: `link-${Date.now()}`, label: url, url }]);
    toast.success('Link added');
  }

  function removeLink(
    setter: React.Dispatch<React.SetStateAction<LinkItem[]>>,
    id: string
  ) {
    setter((prev) => prev.filter((l) => l.id !== id));
    toast.success('Link removed');
  }

  return (
    <div className='flex h-full w-72 shrink-0 flex-col overflow-hidden border-l'>
      <Tabs defaultValue='details' className='flex flex-1 flex-col'>
        {/* Tab header */}
        <div className='flex items-center justify-between border-b px-3 pt-2'>
          <TabsList className='h-8'>
            <TabsTrigger value='details' className='text-xs'>
              Details
            </TabsTrigger>
            <TabsTrigger value='copilot' className='text-xs'>
              Copilot
            </TabsTrigger>
          </TabsList>
          <div className='flex items-center gap-0.5'>
            <Button variant='ghost' size='icon' className='h-6 w-6'>
              <ExternalLink className='h-3 w-3' />
            </Button>
            <Button variant='ghost' size='icon' className='h-6 w-6'>
              <Maximize2 className='h-3 w-3' />
            </Button>
          </div>
        </div>

        {/* ═══ DETAILS TAB ═══ */}
        <TabsContent value='details' className='mt-0 flex-1 overflow-hidden'>
          <ScrollArea className='h-full'>
            {/* Assignee & Team */}
            <div className='space-y-2 px-3 pt-3'>
              <EditableRow
                label='Assignee'
                value={assignee}
                onSave={(v) => {
                  setAssignee(v);
                  toast.success('Assignee updated');
                }}
              />
              <EditableRow
                label='Team Inbox'
                value={teamInbox}
                onSave={(v) => {
                  setTeamInbox(v);
                  toast.success('Team inbox updated');
                }}
              />
            </div>

            <Separator className='my-2' />

            {/* Links */}
            <DetailSection title='Links' icon={LinkIcon} defaultOpen={true}>
              <div className='space-y-2'>
                <InteractiveLinkRow
                  label='Tracker ticket'
                  links={trackerLinks}
                  onAdd={(url) => addLink(setTrackerLinks, url)}
                  onRemove={(id) => removeLink(setTrackerLinks, id)}
                />
                <InteractiveLinkRow
                  label='Back-office tickets'
                  links={backofficeLinks}
                  onAdd={(url) => addLink(setBackofficeLinks, url)}
                  onRemove={(id) => removeLink(setBackofficeLinks, id)}
                />
                <InteractiveLinkRow
                  label='Side conversations'
                  links={sideConvos}
                  onAdd={(url) => addLink(setSideConvos, url)}
                  onRemove={(id) => removeLink(setSideConvos, id)}
                />
              </div>
            </DetailSection>

            <Separator />

            {/* Conversation attributes */}
            <DetailSection
              title='Conversation attributes'
              icon={MessageSquare}
              defaultOpen={true}
            >
              <div className='space-y-0'>
                <EditableRow
                  label='AI Title'
                  value={aiTitle}
                  onSave={(v) => {
                    setAiTitle(v);
                    toast.success('AI Title updated');
                  }}
                />
                <div className='flex items-center justify-between py-1'>
                  <span className='text-muted-foreground text-[11px]'>ID</span>
                  <span className='font-mono text-[10px] font-medium'>
                    {conversationId.slice(0, 16)}
                  </span>
                </div>
                <EditableRow
                  label='Company'
                  value={company}
                  onSave={(v) => {
                    setCompany(v);
                    toast.success('Company updated');
                  }}
                />
                <EditableRow
                  label='Brand'
                  value={brand}
                  onSave={(v) => {
                    setBrand(v);
                    toast.success('Brand updated');
                  }}
                />
                <EditableRow
                  label='Subject'
                  value={subject}
                  onSave={(v) => {
                    setSubject(v);
                    toast.success('Subject updated');
                  }}
                  placeholder='+ Add'
                />
                <EditableRow
                  label='CX Score rating'
                  value={cxRating}
                  onSave={(v) => {
                    setCxRating(v);
                    toast.success('CX Score updated');
                  }}
                  placeholder='—'
                />
                <EditableRow
                  label='CX Score explanation'
                  value={cxExplanation}
                  onSave={(v) => {
                    setCxExplanation(v);
                    toast.success('CX explanation updated');
                  }}
                  placeholder='—'
                />
                <button className='text-primary mt-1 text-[11px]'>
                  See all
                </button>
              </div>
            </DetailSection>

            <Separator />

            {/* Topics */}
            <div className='px-3 py-2'>
              <div className='flex items-center justify-between'>
                <span className='flex items-center gap-2 text-xs font-medium'>
                  <Tags className='h-3.5 w-3.5' />
                  Topics
                </span>
                <AddItemPopover
                  placeholder='Add topic...'
                  onAdd={(v) => {
                    setTopics((prev) => [...prev, v]);
                    toast.success('Topic added');
                  }}
                >
                  <Button variant='ghost' size='icon' className='h-5 w-5'>
                    <Plus className='h-3 w-3' />
                  </Button>
                </AddItemPopover>
              </div>
              {topics.length > 0 && (
                <div className='mt-1.5 flex flex-wrap gap-1'>
                  {topics.map((t, i) => (
                    <RemovableBadge
                      key={i}
                      label={t}
                      onRemove={() => {
                        setTopics((prev) => prev.filter((_, j) => j !== i));
                        toast.success('Topic removed');
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* User data */}
            <DetailSection title='User data' icon={User} defaultOpen={false}>
              <div className='space-y-1'>
                <EditableRow
                  label='Name'
                  value={conversation?.userId ?? 'Anonymous'}
                  onSave={() => toast.success('Updated')}
                />
                <EditableRow
                  label='Email'
                  value=''
                  onSave={() => toast.success('Updated')}
                  placeholder='+ Add email'
                />
                <EditableRow
                  label='Location'
                  value=''
                  onSave={() => toast.success('Updated')}
                  placeholder='Unknown'
                />
              </div>
            </DetailSection>

            <Separator />

            {/* Recent conversations */}
            <DetailSection
              title='Recent conversations'
              icon={MessageSquare}
              defaultOpen={false}
            >
              <div className='text-muted-foreground text-[11px]'>
                No recent conversations
              </div>
            </DetailSection>

            <Separator />

            {/* User notes */}
            <DetailSection
              title='User notes'
              icon={FileText}
              defaultOpen={false}
            >
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder='Add a note about this user...'
                className='border-input bg-background placeholder:text-muted-foreground min-h-[60px] w-full rounded-md border px-2 py-1.5 text-[11px] focus:outline-none'
                onBlur={() => {
                  if (notes.trim()) toast.success('Note saved');
                }}
              />
            </DetailSection>

            <Separator />

            {/* User tags */}
            <DetailSection
              title='User tags'
              icon={Tags}
              defaultOpen={false}
              onAdd={() => {}}
            >
              <div className='space-y-1.5'>
                {tags.length === 0 && (
                  <span className='text-muted-foreground text-[11px]'>
                    No tags
                  </span>
                )}
                <div className='flex flex-wrap gap-1'>
                  {tags.map((t, i) => (
                    <RemovableBadge
                      key={i}
                      label={t}
                      onRemove={() => {
                        setTags((prev) => prev.filter((_, j) => j !== i));
                        toast.success('Tag removed');
                      }}
                    />
                  ))}
                </div>
                <AddItemPopover
                  placeholder='Add tag...'
                  onAdd={(v) => {
                    setTags((prev) => [...prev, v]);
                    toast.success('Tag added');
                  }}
                >
                  <button className='text-primary text-[11px]'>
                    + Add tag
                  </button>
                </AddItemPopover>
              </div>
            </DetailSection>

            <Separator />

            {/* User segments */}
            <DetailSection
              title='User segments'
              icon={Users}
              defaultOpen={false}
              onAdd={() => {}}
            >
              <div className='space-y-1.5'>
                {segments.length === 0 && (
                  <span className='text-muted-foreground text-[11px]'>
                    No segments
                  </span>
                )}
                <div className='flex flex-wrap gap-1'>
                  {segments.map((s, i) => (
                    <RemovableBadge
                      key={i}
                      label={s}
                      onRemove={() => {
                        setSegments((prev) => prev.filter((_, j) => j !== i));
                        toast.success('Segment removed');
                      }}
                    />
                  ))}
                </div>
                <AddItemPopover
                  placeholder='Add segment...'
                  onAdd={(v) => {
                    setSegments((prev) => [...prev, v]);
                    toast.success('Segment added');
                  }}
                >
                  <button className='text-primary text-[11px]'>
                    + Add segment
                  </button>
                </AddItemPopover>
              </div>
            </DetailSection>

            <Separator />

            {/* Recent page views */}
            <DetailSection
              title='Recent page views'
              icon={FileText}
              defaultOpen={false}
            >
              <div className='text-muted-foreground text-[11px]'>
                No page views tracked
              </div>
            </DetailSection>

            <Separator />

            {/* Similar conversations */}
            <DetailSection
              title='Similar conversations'
              icon={MessageSquare}
              defaultOpen={false}
            >
              <div className='text-muted-foreground text-[11px]'>
                No similar conversations found
              </div>
            </DetailSection>

            <Separator />

            {/* Edit apps */}
            <div className='px-3 py-3'>
              <button className='text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-[11px] transition-colors'>
                <Pencil className='h-3 w-3' />
                Edit apps
              </button>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ═══ COPILOT TAB ═══ */}
        <TabsContent value='copilot' className='mt-0 flex-1 overflow-hidden'>
          <CopilotChat
            key={conversationId}
            conversationContext={copilotContext}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
