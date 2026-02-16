'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  listMessagesAction,
  updateConversationStatusAction
} from '@/features/conversation/actions/conversation-crud';
import { getConversationAction } from '@/features/conversation/actions/conversation-crud';
import { useRealtime } from '@/hooks/use-realtime';
import type {
  Message,
  Conversation,
  ConversationStatus
} from '@/types/appwrite';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
  Bold,
  Bot,
  ChevronDown,
  Columns3,
  ExternalLink,
  Forward,
  Italic,
  Link as LinkIcon,
  Loader2,
  Mail,
  MessageSquare,
  Moon,
  MoreHorizontal,
  Paperclip,
  Phone,
  Send,
  Smile,
  Sparkles,
  Star,
  User,
  X,
  XCircle
} from 'lucide-react';

/* Channel config for header display */
const channelLabels: Record<string, string> = {
  web: 'Messenger',
  email: 'Email',
  whatsapp: 'WhatsApp',
  sms: 'Phone & SMS',
  voice: 'Voice'
};

interface InboxThreadProps {
  conversationId: string;
  tenantId: string;
  onToggleDetail: () => void;
  onMessagesLoaded?: (msgs: Array<{ role: string; content: string }>) => void;
}

export function InboxThread({
  conversationId,
  tenantId,
  onToggleDetail,
  onMessagesLoaded
}: InboxThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [starred, setStarred] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isDemo = conversationId.startsWith('demo-');

  /* Demo messages per channel so Copilot has real content to work with */
  const demoMessages: Record<
    string,
    Array<{ role: string; content: string }>
  > = {
    messenger: [
      {
        role: 'user',
        content:
          'Hej! Jag undrar om ni kan hjälpa mig med min beställning? Jag har väntat i över två veckor och paketet har fortfarande inte kommit. Ordernummer #45892.'
      },
      {
        role: 'assistant',
        content:
          'Hej! Tack för att du kontaktar oss. Jag ska kolla upp din beställning direkt. Kan du bekräfta vilken e-postadress du använde vid köpet?'
      },
      {
        role: 'user',
        content:
          'Ja, det var erik.lindgren@gmail.com. Jag betalade med Klarna och det har redan dragits pengar.'
      }
    ],
    email: [
      {
        role: 'user',
        content:
          'Dear Support,\n\nI am writing to request a refund for order #78234. The product arrived damaged and is not usable. I have attached photos of the damage.\n\nPlease process the refund as soon as possible.\n\nBest regards,\nAnna Svensson'
      },
      {
        role: 'assistant',
        content:
          "Hi Anna,\n\nThank you for reaching out. I'm sorry to hear about the damaged product. We'll get this sorted for you right away.\n\nCould you please confirm: would you prefer a full refund or a replacement?"
      }
    ],
    whatsapp: [
      {
        role: 'user',
        content:
          "Bonjour, je voudrais savoir si vous livrez en France ? J'ai vu vos produits sur Instagram et je suis très intéressé."
      },
      {
        role: 'assistant',
        content:
          'Bonjour ! Merci pour votre intérêt. Oui, nous livrons en France. Les frais de livraison sont de 15€ et le délai est de 5-7 jours.'
      },
      {
        role: 'user',
        content:
          'Parfait ! Et est-ce que je peux payer avec PayPal ? Aussi, avez-vous le modèle X500 en stock en couleur bleue ?'
      }
    ],
    phone: [
      {
        role: 'user',
        content:
          'مرحبا، أحتاج مساعدة في إعداد المنتج الذي اشتريته. لا أستطيع تشغيله والتعليمات غير واضحة.'
      },
      {
        role: 'assistant',
        content:
          'مرحبا! شكرا لاتصالك. سأساعدك في إعداد المنتج خطوة بخطوة. ما هو رقم الموديل؟'
      },
      {
        role: 'user',
        content:
          'الموديل هو RT-3000. لقد حاولت اتباع الدليل لكنه باللغة الإنجليزية فقط.'
      }
    ]
  };

  const load = useCallback(async () => {
    if (isDemo) {
      setLoading(false);
      /* Report demo messages to parent for Copilot context */
      const channelKey = conversationId.replace('demo-', '');
      const demoMsgs = demoMessages[channelKey] ?? demoMessages.messenger;
      if (onMessagesLoaded) {
        onMessagesLoaded(demoMsgs);
      }
      return;
    }
    setLoading(true);
    const [msgRes, convoRes] = await Promise.all([
      listMessagesAction(conversationId, tenantId),
      getConversationAction(conversationId, tenantId)
    ]);
    if (msgRes.success) {
      setMessages(msgRes.messages ?? []);
    }
    if (convoRes.success && convoRes.conversation) {
      setConversation(convoRes.conversation as Conversation);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, tenantId, isDemo]);

  useEffect(() => {
    load();
    setReplyText('');
  }, [load]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /* Report messages to parent for Copilot context */
  useEffect(() => {
    if (onMessagesLoaded) {
      onMessagesLoaded(
        messages.map((m) => ({ role: m.role, content: m.content }))
      );
    }
  }, [messages, onMessagesLoaded]);

  useRealtime<Message>({
    collection: 'MESSAGES',
    events: ['create'],
    filter: (msg) => msg.conversationId === conversationId,
    onEvent: (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.$id === msg.$id)) return prev;
        return [...prev, msg];
      });
    }
  });

  async function handleStatusChange(status: ConversationStatus) {
    if (isDemo) {
      toast.info('This is a demo conversation');
      return;
    }
    const res = await updateConversationStatusAction(
      conversationId,
      tenantId,
      status
    );
    if (res.success) {
      toast.success(`Conversation ${status}`);
    } else {
      toast.error(res.error ?? 'Failed to update');
    }
  }

  function getEditorText(): string {
    if (!editorRef.current) return replyText;
    return editorRef.current.innerText.trim();
  }

  function getEditorHtml(): string {
    if (!editorRef.current) return replyText;
    return editorRef.current.innerHTML;
  }

  function clearEditor() {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setReplyText('');
  }

  function execFormat(command: string) {
    editorRef.current?.focus();
    document.execCommand(command, false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAttachedFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  }

  function removeFile(index: number) {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSendReply() {
    const text = getEditorText();
    const html = getEditorHtml();
    if (!text && attachedFiles.length === 0) return;

    const fileNames = attachedFiles.map((f) => f.name);
    const content =
      fileNames.length > 0 ? `${text}\n\n📎 ${fileNames.join(', ')}` : text;

    const newMsg = {
      $id: `local-${Date.now()}`,
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
      $permissions: [],
      $databaseId: '',
      $collectionId: '',
      conversationId,
      role: 'assistant' as const,
      content,
      confidence: 1,
      citations: [],
      metadata: { html, files: fileNames }
    } as unknown as Message;
    setMessages((prev) => [...prev, newMsg]);
    clearEditor();
    setAttachedFiles([]);
    toast.success('Reply sent');
  }

  async function handleAiReply() {
    setAiGenerating(true);
    try {
      const conversationMsgs =
        messages.length > 0
          ? messages.map((m) => ({ role: m.role, content: m.content }))
          : (demoMessages[conversationId.replace('demo-', '')] ??
            demoMessages.messenger);

      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:
            'Generate a professional, helpful reply to the customer based on this conversation. Write ONLY the reply text, no explanations.',
          conversationContext: {
            channel: channelKey,
            status: conversation?.status ?? 'open',
            messages: conversationMsgs
          }
        })
      });

      if (!res.ok) throw new Error('AI request failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              aiText += data;
            }
          }
        }
      }

      if (aiText.trim() && editorRef.current) {
        editorRef.current.innerText = aiText.trim();
        setReplyText(aiText.trim());
      }
    } catch {
      toast.error('Failed to generate AI reply');
    } finally {
      setAiGenerating(false);
    }
  }

  /* channel key needed early for AI reply */
  const channelKey = isDemo
    ? conversationId.replace('demo-', '')
    : (conversation?.channel ?? 'web');

  /* Determine channel for display */
  const channelLabel = channelLabels[channelKey] ?? channelLabels.web;

  if (loading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Icons.spinner className='text-muted-foreground h-6 w-6 animate-spin' />
      </div>
    );
  }

  /* Demo content for when a demo conversation is selected */
  const renderDemoContent = () => (
    <div className='mx-auto max-w-lg space-y-6 py-8'>
      {/* Link icon */}
      <div className='flex justify-start'>
        <LinkIcon className='text-muted-foreground h-4 w-4' />
      </div>

      {/* Channel icon placeholder */}
      <div className='flex justify-center'>
        <div className='bg-muted flex h-16 w-16 items-center justify-center rounded-xl'>
          <MessageSquare className='text-muted-foreground h-8 w-8' />
        </div>
      </div>

      {/* Demo message */}
      <div className='space-y-3 text-sm leading-relaxed'>
        <p>
          This is a demo message. It shows how a customer conversation from the{' '}
          <span className='font-medium'>{channelLabel}</span> will look in your
          Inbox. Conversations handled by{' '}
          <span className='font-medium'>SWEO AI Agent</span> will also appear
          here.
        </p>
        <p>
          Once a channel is installed, all{' '}
          <span className='text-primary underline'>conversations</span> come
          straight to your Inbox, so you can route them to the right team.
        </p>
      </div>

      {/* Install link card */}
      <div className='flex items-center gap-3 pt-2'>
        <div className='bg-muted flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold'>
          M
        </div>
        <div>
          <p className='text-primary text-sm font-medium underline'>
            Install {channelLabel}
          </p>
          <div className='text-muted-foreground flex items-center gap-1.5 text-[10px]'>
            <MessageSquare className='h-3 w-3' />
            <span>4d</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className='flex h-full flex-col'>
      {/* Header bar — like Intercom */}
      <div className='flex h-12 items-center justify-between border-b px-4'>
        <span className='text-sm font-semibold'>{channelLabel}</span>

        <div className='flex items-center gap-1'>
          {/* Star — mark customer as important */}
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            onClick={() => {
              setStarred((s) => !s);
              toast.success(
                starred ? 'Removed from starred' : 'Marked as important'
              );
            }}
            title={starred ? 'Remove star' : 'Mark as important'}
          >
            <Star
              className={cn(
                'h-3.5 w-3.5 transition-colors',
                starred ? 'fill-yellow-400 text-yellow-400' : ''
              )}
            />
          </Button>

          {/* 3-dots — Close or Forward */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='h-7 w-7'>
                <MoreHorizontal className='h-3.5 w-3.5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-48'>
              <DropdownMenuItem
                onClick={() => {
                  handleStatusChange('resolved');
                }}
              >
                <XCircle className='mr-2 h-4 w-4' />
                Close conversation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setForwardDialogOpen(true)}>
                <Forward className='mr-2 h-4 w-4' />
                Forward customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mail — send chat copy to customer */}
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            onClick={() => setEmailDialogOpen(true)}
            title='Send chat copy via email'
          >
            <Mail className='h-3.5 w-3.5' />
          </Button>

          {/* Moon — snooze / put in queue */}
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7'
            onClick={() => {
              setSnoozed((s) => !s);
              toast.success(
                snoozed ? 'Removed from queue' : 'Customer put in queue'
              );
            }}
            title={snoozed ? 'Remove from queue' : 'Put in queue'}
          >
            <Moon
              className={cn(
                'h-3.5 w-3.5 transition-colors',
                snoozed ? 'fill-blue-400 text-blue-400' : ''
              )}
            />
          </Button>
        </div>
      </div>

      {/* Email dialog — send chat copy */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Send chat copy</DialogTitle>
            <DialogDescription>
              Send a copy of this conversation to the customer&apos;s email
              address.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <Input
              placeholder='customer@example.com'
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              type='email'
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!emailTo.includes('@')}
              onClick={() => {
                toast.success(`Chat copy sent to ${emailTo}`);
                setEmailDialogOpen(false);
                setEmailTo('');
              }}
            >
              <Mail className='mr-2 h-4 w-4' />
              Send copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward dialog */}
      <Dialog open={forwardDialogOpen} onOpenChange={setForwardDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Forward customer</DialogTitle>
            <DialogDescription>
              Transfer this conversation to another teammate or team inbox.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <Input
              placeholder='Teammate name or email'
              value={forwardTo}
              onChange={(e) => setForwardTo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setForwardDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!forwardTo.trim()}
              onClick={() => {
                toast.success(`Conversation forwarded to ${forwardTo}`);
                setForwardDialogOpen(false);
                setForwardTo('');
              }}
            >
              <Forward className='mr-2 h-4 w-4' />
              Forward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Messages / Demo content */}
      <ScrollArea className='flex-1 px-4' ref={scrollRef}>
        {isDemo ? (
          renderDemoContent()
        ) : messages.length === 0 ? (
          <div className='text-muted-foreground py-12 text-center text-sm'>
            No messages yet
          </div>
        ) : (
          <div className='space-y-4 py-4'>
            {messages.map((msg) => (
              <div key={msg.$id} className='flex gap-3'>
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    msg.role === 'user'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                  )}
                >
                  {msg.role === 'user' ? (
                    <User className='h-3.5 w-3.5' />
                  ) : (
                    <Bot className='h-3.5 w-3.5' />
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='mb-1 flex items-center gap-2'>
                    <span className='text-xs font-medium'>
                      {msg.role === 'user' ? 'Customer' : 'SWEO AI'}
                    </span>
                    <span className='text-muted-foreground text-[10px]'>
                      {new Date(msg.$createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {msg.confidence != null && msg.role === 'assistant' && (
                      <Badge variant='outline' className='h-4 px-1 text-[9px]'>
                        {(msg.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    )}
                  </div>
                  <div className='prose prose-sm dark:prose-invert max-w-none'>
                    <p className='text-sm leading-relaxed whitespace-pre-wrap'>
                      {msg.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Reply composer — Intercom style */}
      <div className='border-t'>
        <div className='flex items-center gap-2 px-4 py-2'>
          <button className='text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors'>
            <MessageSquare className='h-3.5 w-3.5' />
            Reply
            <ChevronDown className='h-3 w-3' />
          </button>
        </div>
        <Separator />

        {/* ContentEditable editor */}
        <div className='px-4 pt-3 pb-2'>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className='empty:before:text-muted-foreground max-h-[200px] min-h-[72px] w-full overflow-y-auto bg-transparent text-sm outline-none empty:before:content-[attr(data-placeholder)]'
            data-placeholder='Write a reply…'
            onInput={() => {
              setReplyText(editorRef.current?.innerText.trim() ?? '');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSendReply();
              }
              if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                execFormat('bold');
              }
              if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                execFormat('italic');
              }
            }}
          />
        </div>

        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div className='flex flex-wrap gap-2 px-4 pb-2'>
            {attachedFiles.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className='bg-muted flex items-center gap-1.5 rounded-md px-2 py-1 text-xs'
              >
                <Paperclip className='h-3 w-3 shrink-0' />
                <span className='max-w-[120px] truncate'>{file.name}</span>
                <span className='text-muted-foreground'>
                  {(file.size / 1024).toFixed(0)}KB
                </span>
                <button
                  onClick={() => removeFile(i)}
                  className='text-muted-foreground hover:text-foreground ml-0.5'
                >
                  <X className='h-3 w-3' />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar + Send */}
        <div className='flex items-center justify-between px-4 pb-3'>
          <div className='flex items-center gap-0.5'>
            <button
              onClick={() => execFormat('bold')}
              className='text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1.5 transition-colors'
              title='Bold (⌘B)'
            >
              <Bold className='h-3.5 w-3.5' />
            </button>
            <button
              onClick={() => execFormat('italic')}
              className='text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1.5 transition-colors'
              title='Italic (⌘I)'
            >
              <Italic className='h-3.5 w-3.5' />
            </button>

            {/* Emoji picker */}
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <button
                  className='text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1.5 transition-colors'
                  title='Emoji'
                >
                  <Smile className='h-3.5 w-3.5' />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className='w-auto border-0 p-0'
                align='start'
                sideOffset={8}
              >
                <EmojiPicker
                  theme={Theme.AUTO}
                  width={320}
                  height={400}
                  onEmojiClick={(emojiData) => {
                    if (editorRef.current) {
                      editorRef.current.focus();
                      document.execCommand(
                        'insertText',
                        false,
                        emojiData.emoji
                      );
                      setReplyText(editorRef.current.innerText.trim());
                    }
                    setEmojiOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>

            {/* File attachment */}
            <input
              ref={fileInputRef}
              type='file'
              multiple
              className='hidden'
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className='text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1.5 transition-colors'
              title='Attach file'
            >
              <Paperclip className='h-3.5 w-3.5' />
            </button>

            <Separator orientation='vertical' className='mx-1 h-4' />

            {/* AI auto-reply */}
            <button
              onClick={handleAiReply}
              disabled={aiGenerating}
              className='text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors disabled:opacity-50'
              title='Let AI draft a reply'
            >
              {aiGenerating ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Sparkles className='h-3.5 w-3.5' />
              )}
              <span className='hidden sm:inline'>AI Reply</span>
            </button>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-muted-foreground text-[10px]'>⌘ Enter</span>
            <Button
              size='sm'
              className='h-7 gap-1.5 px-3 text-xs'
              disabled={!replyText.trim() && attachedFiles.length === 0}
              onClick={handleSendReply}
            >
              <Send className='h-3 w-3' />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
