'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useChatbotStore } from '../store';
import { DEPARTMENTS } from '../types';
import type { ChatMessage, ChatDepartment } from '../types';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  Send,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Home,
  MessageSquare,
  HelpCircle,
  Megaphone,
  Search
} from 'lucide-react';
import Image from 'next/image';

// ── Helpers ───────────────────────────────────────────────────────────────
let _id = 0;
function uid(): string {
  return `m_${Date.now()}_${++_id}`;
}

function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Nyss';
  if (diffMin < 60) return `${diffMin} m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} t`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} d`;
  return `${Math.floor(diffD / 7)} v`;
}

type TabId = 'home' | 'messages' | 'help' | 'news';

const TABS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Hem', icon: Home },
  { id: 'messages', label: 'Meddelanden', icon: MessageSquare },
  { id: 'help', label: 'Hjälp', icon: HelpCircle },
  { id: 'news', label: 'Nyheter', icon: Megaphone }
];

// ── Main Widget ───────────────────────────────────────────────────────────
export function ChatBotWidget() {
  const {
    isOpen,
    toggleOpen,
    activeTab,
    setActiveTab,
    department,
    setDepartment,
    messages,
    addMessage,
    updateLastAssistantMessage,
    conversationId,
    setConversationId,
    isStreaming,
    setIsStreaming,
    hasStartedConversation,
    setHasStartedConversation,
    resetChat
  } = useChatbotStore();

  const [inputValue, setInputValue] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [inConversation, setInConversation] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current && inConversation) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, inConversation]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  // Sync inConversation with store
  useEffect(() => {
    if (department) setInConversation(true);
  }, [department]);

  const handleSelectDepartment = useCallback(
    (dept: ChatDepartment) => {
      setDepartment(dept);
      setInConversation(true);
      const info = DEPARTMENTS.find((d) => d.id === dept)!;
      if (!hasStartedConversation) {
        addMessage({
          id: uid(),
          role: 'assistant',
          content: info.greeting,
          timestamp: new Date()
        });
        setHasStartedConversation(true);
      }
    },
    [
      setDepartment,
      addMessage,
      hasStartedConversation,
      setHasStartedConversation
    ]
  );

  const handleStartChat = useCallback(() => {
    setActiveTab('messages');
  }, [setActiveTab]);

  const handleBackToHome = useCallback(() => {
    setInConversation(false);
    setActiveTab('home');
  }, [setActiveTab]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming || !department) return;

    setInputValue('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    addMessage({
      id: uid(),
      role: 'user',
      content: text,
      timestamp: new Date()
    });
    addMessage({
      id: uid(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    });

    setIsStreaming(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, department, conversationId })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        updateLastAssistantMessage(err.error ?? 'Något gick fel. Försök igen.');
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      if (!reader) throw new Error('Missing body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const ev = JSON.parse(raw);
            if (ev.type === 'delta') {
              full += ev.content;
              updateLastAssistantMessage(full);
            } else if (ev.type === 'done' && ev.conversationId) {
              setConversationId(ev.conversationId);
            } else if (ev.type === 'escalated') {
              updateLastAssistantMessage(
                ev.message ?? 'Jag kopplar dig till en agent.'
              );
              if (ev.conversationId) setConversationId(ev.conversationId);
            } else if (ev.type === 'blocked') {
              updateLastAssistantMessage(
                ev.message ?? 'Förfrågan blockerades av våra policyer.'
              );
            } else if (ev.type === 'error') {
              updateLastAssistantMessage(ev.message ?? 'Ett fel uppstod.');
            }
          } catch {
            /* skip */
          }
        }
      }

      if (!full) {
        updateLastAssistantMessage(
          'Tack för ditt meddelande. Vårt team återkommer till dig inom kort.'
        );
      }
      if (!isOpen) setUnreadCount((c) => c + 1);
    } catch {
      updateLastAssistantMessage('Anslutningen misslyckades. Försök igen.');
    } finally {
      setIsStreaming(false);
    }
  }, [
    inputValue,
    isStreaming,
    department,
    conversationId,
    addMessage,
    updateLastAssistantMessage,
    setConversationId,
    setIsStreaming,
    isOpen
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  };

  const lastMessage =
    messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <>
      {/* ── Launcher ───────────────────────────────────────────────── */}
      <motion.button
        onClick={toggleOpen}
        className={cn(
          'fixed right-6 bottom-6 z-[99999]',
          'flex h-[56px] w-[56px] items-center justify-center rounded-full',
          'cursor-pointer select-none',
          'bg-foreground text-background',
          'dark:bg-white',
          'shadow-[0_2px_12px_rgba(0,0,0,0.15)]',
          'transition-all duration-150',
          'hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]',
          'active:scale-[0.96]',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
        )}
        aria-label={isOpen ? 'Stäng chatt' : 'Öppna chatt'}
      >
        <AnimatePresence mode='wait' initial={false}>
          {isOpen ? (
            <motion.span
              key='close'
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown className='h-5 w-5' strokeWidth={2.5} />
            </motion.span>
          ) : (
            <motion.span
              key='open'
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className='relative'
            >
              <MessageSquare
                className='h-6 w-6 fill-orange-500 text-orange-500 dark:fill-[#0097b2] dark:text-[#0097b2]'
                strokeWidth={2}
              />
              {unreadCount > 0 && (
                <span className='absolute -top-1.5 -right-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white'>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Panel ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
              'fixed right-6 bottom-[72px] z-[99998]',
              'flex flex-col overflow-hidden',
              'w-[400px] max-w-[calc(100vw-3rem)]',
              'h-[calc(100vh-120px)] max-h-[680px]',
              'rounded-2xl',
              'shadow-[0_5px_40px_rgba(0,0,0,0.14)]',
              'bg-background'
            )}
          >
            {inConversation ? (
              /* ── Conversation View ── */
              <div className='flex min-h-0 flex-1 flex-col'>
                <ConversationHeader
                  department={department}
                  onBack={handleBackToHome}
                  onClose={toggleOpen}
                />

                <div className='flex-1 overflow-y-auto overscroll-contain'>
                  <div className='space-y-4 px-4 py-4'>
                    {messages.map((msg, i) => (
                      <MessageBubble
                        key={msg.id ?? i}
                        message={msg}
                        isLast={i === messages.length - 1}
                        isStreaming={
                          isStreaming &&
                          i === messages.length - 1 &&
                          msg.role === 'assistant'
                        }
                      />
                    ))}
                    <div ref={endRef} />
                  </div>
                </div>

                <div className='px-4 pt-2 pb-3'>
                  <div
                    className={cn(
                      'flex items-end gap-2 rounded-xl',
                      'border-border border',
                      'bg-background',
                      'px-3.5 py-2.5',
                      'transition-colors',
                      'focus-within:border-foreground/20'
                    )}
                  >
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder='Ställ en fråga ...'
                      rows={1}
                      disabled={isStreaming}
                      className={cn(
                        'text-foreground placeholder:text-muted-foreground/60',
                        'flex-1 resize-none bg-transparent',
                        'border-0 py-1',
                        'text-[14px] leading-[1.5]',
                        'outline-none',
                        'max-h-[100px] min-h-[24px]',
                        'disabled:cursor-not-allowed disabled:opacity-40'
                      )}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isStreaming}
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                        'transition-all duration-100',
                        inputValue.trim() && !isStreaming
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground/40',
                        'disabled:cursor-default',
                        'active:scale-95'
                      )}
                      aria-label='Skicka'
                    >
                      <Send className='h-3.5 w-3.5' />
                    </button>
                  </div>
                  <PoweredBy />
                </div>
              </div>
            ) : (
              /* ── Tabbed Home View ── */
              <div className='flex min-h-0 flex-1 flex-col'>
                <div className='flex-1 overflow-y-auto overscroll-contain'>
                  {activeTab === 'home' && (
                    <HomeTab
                      onStartChat={handleStartChat}
                      lastMessage={lastMessage}
                      hasConversation={hasStartedConversation}
                      onResumeChat={() => setInConversation(true)}
                    />
                  )}
                  {activeTab === 'messages' && (
                    <MessagesTab
                      onSelectDepartment={handleSelectDepartment}
                      hasConversation={hasStartedConversation}
                      lastMessage={lastMessage}
                      onResume={() => setInConversation(true)}
                    />
                  )}
                  {activeTab === 'help' && <HelpTab />}
                  {activeTab === 'news' && <NewsTab />}
                </div>

                {/* ── Bottom Tab Bar ── */}
                <nav className='border-border flex border-t'>
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'flex flex-1 flex-col items-center gap-0.5 py-2.5',
                          'text-[11px] transition-colors',
                          isActive
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground/70'
                        )}
                      >
                        <Icon
                          className='h-5 w-5'
                          strokeWidth={isActive ? 2 : 1.5}
                        />
                        <span className={cn(isActive && 'font-medium')}>
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Home Tab ──────────────────────────────────────────────────────────────
function HomeTab({
  onStartChat,
  lastMessage,
  hasConversation,
  onResumeChat
}: {
  onStartChat: () => void;
  lastMessage: ChatMessage | null;
  hasConversation: boolean;
  onResumeChat: () => void;
}) {
  return (
    <div className='flex flex-col'>
      {/* Hero — 40% of widget height with image + dark overlay */}
      <div
        className='relative flex flex-col justify-end overflow-hidden px-6 pb-8'
        style={{
          height: '40%',
          minHeight: '200px',
          backgroundImage: 'url(/hero-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Dark overlay */}
        <div className='absolute inset-0 bg-black/55' />
        <p className='relative text-[28px] leading-tight font-bold text-white'>
          Hej
        </p>
        <p className='relative text-[28px] leading-tight font-bold text-white/70'>
          Hur kan vi hjälpa till?
        </p>
      </div>

      {/* "Ställ en fråga" card */}
      <div className='mt-4 px-4'>
        <button
          onClick={onStartChat}
          className={cn(
            'flex w-full items-center gap-3.5 rounded-xl p-4 text-left',
            'bg-background',
            'shadow-[0_1px_8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)]',
            'transition-all duration-100',
            'hover:shadow-[0_2px_12px_rgba(0,0,0,0.12)]',
            'active:scale-[0.995]'
          )}
        >
          <div className='min-w-0 flex-1'>
            <span className='text-foreground text-[15px] font-semibold'>
              Ställ en fråga
            </span>
            <br />
            <span className='text-muted-foreground text-[13px]'>
              Vår bot och vårt team kan hjälpa dig
            </span>
          </div>
          <Image
            src='/logo_sweo.svg'
            alt='SWEO'
            width={100}
            height={36}
            className='shrink-0 dark:invert'
          />
          <ChevronRight className='text-muted-foreground/40 h-4 w-4 shrink-0' />
        </button>
      </div>

      {/* Senaste meddelande */}
      {hasConversation && lastMessage && (
        <div className='mt-3 px-4'>
          <div className='bg-background overflow-hidden rounded-xl shadow-[0_1px_8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)]'>
            <div className='px-4 pt-3 pb-1'>
              <span className='text-foreground text-[13px] font-semibold'>
                Senaste meddelande
              </span>
            </div>
            <button
              onClick={onResumeChat}
              className='hover:bg-accent flex w-full items-center gap-3 px-4 py-3 text-left transition-colors'
            >
              <div className='flex shrink-0 -space-x-2'>
                <Image
                  src='/team-cornelia.png'
                  alt=''
                  width={32}
                  height={32}
                  className='border-background h-8 w-8 rounded-full border-2 object-cover'
                />
                <Image
                  src='/team-linnea.jpg'
                  alt=''
                  width={32}
                  height={32}
                  className='border-background h-8 w-8 rounded-full border-2 object-cover'
                />
                <Image
                  src='/team-member3.jpg'
                  alt=''
                  width={32}
                  height={32}
                  className='border-background h-8 w-8 rounded-full border-2 object-cover'
                />
              </div>
              <div className='min-w-0 flex-1'>
                <p className='text-foreground text-[13px] font-medium'>
                  Chatta med oss
                </p>
                <p className='text-muted-foreground truncate text-[12px]'>
                  SWEO: {lastMessage.content.slice(0, 50) || '...'}
                </p>
              </div>
              <span className='text-muted-foreground shrink-0 text-[12px]'>
                {formatRelativeTime(lastMessage.timestamp)}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Messages Tab ──────────────────────────────────────────────────────────
function MessagesTab({
  onSelectDepartment,
  hasConversation,
  lastMessage,
  onResume
}: {
  onSelectDepartment: (dept: ChatDepartment) => void;
  hasConversation: boolean;
  lastMessage: ChatMessage | null;
  onResume: () => void;
}) {
  return (
    <div className='flex flex-col'>
      <div className='flex items-center justify-between px-5 pt-5 pb-2'>
        <h2 className='text-foreground text-[17px] font-semibold'>
          Meddelanden
        </h2>
      </div>

      {/* Existing conversation */}
      {hasConversation && lastMessage && (
        <>
          <button
            onClick={onResume}
            className='hover:bg-accent flex items-center gap-3 px-5 py-3.5 text-left transition-colors'
          >
            <div className='bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full'>
              <Image
                src='/logo-icon-light.svg'
                alt=''
                width={22}
                height={22}
                className='dark:hidden'
              />
              <Image
                src='/logo-icon-dark.svg'
                alt=''
                width={22}
                height={22}
                className='hidden dark:block'
              />
            </div>
            <div className='min-w-0 flex-1'>
              <p className='text-foreground text-[14px] font-medium'>
                Chatta med SWEO
              </p>
              <p className='text-muted-foreground truncate text-[13px]'>
                SWEO: {lastMessage.content.slice(0, 50) || '...'}
              </p>
            </div>
            <span className='text-muted-foreground shrink-0 text-[12px]'>
              {formatRelativeTime(lastMessage.timestamp)}
            </span>
          </button>
          <div className='border-border mx-5 border-t' />
        </>
      )}

      {/* New conversation */}
      <div className='px-5 pt-4'>
        <p className='text-muted-foreground mb-3 text-[12px] font-medium tracking-wider uppercase'>
          Ny konversation
        </p>
        <div className='space-y-1'>
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept.id}
              onClick={() => onSelectDepartment(dept.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl p-3 text-left',
                'transition-colors duration-100',
                'hover:bg-accent active:bg-accent/80'
              )}
            >
              {dept.id === 'sales' ? (
                <Image
                  src='/team-member3.jpg'
                  alt=''
                  width={36}
                  height={36}
                  className='h-9 w-9 shrink-0 rounded-full object-cover'
                />
              ) : (
                <div className='flex shrink-0 -space-x-2.5'>
                  <Image
                    src='/team-cornelia.png'
                    alt=''
                    width={32}
                    height={32}
                    className='border-background h-8 w-8 rounded-full border-2 object-cover'
                  />
                  <Image
                    src='/team-linnea.jpg'
                    alt=''
                    width={32}
                    height={32}
                    className='border-background h-8 w-8 rounded-full border-2 object-cover'
                  />
                </div>
              )}
              <div className='min-w-0 flex-1'>
                <p className='text-foreground text-[14px] font-medium'>
                  {dept.label}
                </p>
                <p className='text-muted-foreground text-[12px]'>
                  {dept.description}
                </p>
              </div>
              <ChevronRight className='text-muted-foreground/30 h-4 w-4 shrink-0' />
            </button>
          ))}
        </div>
      </div>

      {/* Floating CTA */}
      {!hasConversation && (
        <div className='mt-auto flex justify-center px-4 pt-8 pb-4'>
          <button
            onClick={() => onSelectDepartment('support')}
            className={cn(
              'flex items-center gap-2 rounded-full px-5 py-3',
              'bg-foreground text-background',
              'text-[14px] font-medium',
              'shadow-[0_2px_12px_rgba(0,0,0,0.12)]',
              'hover:shadow-[0_4px_16px_rgba(0,0,0,0.16)]',
              'transition-all duration-150 active:scale-[0.98]'
            )}
          >
            Ställ en fråga
            <HelpCircle className='h-4 w-4' />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Help Tab ──────────────────────────────────────────────────────────────
const HELP_COLLECTIONS = [
  {
    title: 'Kom igång',
    desc: 'Allt du behöver veta för att komma igång med SWEO.',
    articles: 12
  },
  {
    title: 'AI Agent',
    desc: 'Lös kundfrågor direkt och precist — från chatt till e-post.',
    articles: 24
  },
  {
    title: 'Kanaler',
    desc: 'Aktivera kanalerna du använder för att kommunicera med kunder.',
    articles: 18
  },
  {
    title: 'Kunskapsbas',
    desc: 'Hantera och publicera hjälpartiklar för dina kunder.',
    articles: 15
  },
  {
    title: 'Automatiseringar',
    desc: 'Skapa workflows och procedurer som effektiviserar supporten.',
    articles: 9
  }
];

function HelpTab() {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = searchQuery.trim()
    ? HELP_COLLECTIONS.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : HELP_COLLECTIONS;

  const totalCollections = HELP_COLLECTIONS.length;

  return (
    <div className='flex flex-col'>
      {/* Header */}
      <div className='px-5 pt-5 pb-3'>
        <h2 className='text-foreground text-[17px] font-semibold'>Hjälp</h2>
      </div>

      {/* Search */}
      <div className='px-5 pb-3'>
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-lg',
            'border-border bg-muted/40 border',
            'px-3 py-2',
            'focus-within:border-foreground/20 transition-colors'
          )}
        >
          <Search className='text-muted-foreground h-4 w-4 shrink-0' />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Sök efter hjälp'
            className={cn(
              'text-foreground flex-1 bg-transparent text-[14px]',
              'placeholder:text-muted-foreground/60',
              'border-0 outline-none'
            )}
          />
        </div>
      </div>

      {/* Collection count */}
      <div className='px-5 pb-2'>
        <span className='text-muted-foreground text-[13px] font-medium'>
          {filtered.length} samlingar
        </span>
      </div>

      {/* Collections */}
      <div className='divide-border divide-y'>
        {filtered.map((col) => (
          <button
            key={col.title}
            className={cn(
              'flex w-full items-center gap-3 px-5 py-4 text-left',
              'hover:bg-accent transition-colors'
            )}
          >
            <div className='min-w-0 flex-1'>
              <p className='text-foreground text-[15px] font-semibold'>
                {col.title}
              </p>
              <p className='text-muted-foreground mt-0.5 text-[13px] leading-snug'>
                {col.desc}
              </p>
              <p className='text-muted-foreground/60 mt-1 text-[12px]'>
                {col.articles} artiklar
              </p>
            </div>
            <ChevronRight className='text-muted-foreground/30 h-4 w-4 shrink-0' />
          </button>
        ))}

        {filtered.length === 0 && (
          <div className='px-5 py-8 text-center'>
            <p className='text-muted-foreground text-[14px]'>
              Inga resultat hittades
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── News Tab ──────────────────────────────────────────────────────────────
const NEWS_ITEMS = [
  {
    id: 'salesforce-integration',
    badge: 'Integration',
    badgeColor: 'bg-muted text-muted-foreground',
    title: 'Koppla vår AI-plattform till Salesforce',
    description:
      'Synka kunddata, ärenden och kontakter direkt mellan SWEO och Salesforce — automatisera workflows och ge agenten full kontext.',
    image: '/blog-salesforce.png',
    date: '14 feb',
    content: `## Koppla SWEO AI till Salesforce

Genom att integrera SWEO:s AI-plattform med Salesforce får du en sömlös koppling mellan kunddata och automatiserad support.

### Så fungerar det

**1. Anslut ditt Salesforce-konto**
Gå till Inställningar → Integrationer → Salesforce. Logga in med ditt Salesforce-konto och ge SWEO nödvändiga behörigheter.

**2. Synka kunddata automatiskt**
När integrationen är aktiv hämtar AI-agenten automatiskt relevant kundinformation — kontaktuppgifter, ärendehistorik och avtalsstatus — direkt från Salesforce.

**3. Skapa ärenden i realtid**
Om AI-agenten inte kan lösa en fråga skapas ett nytt ärende i Salesforce automatiskt, med hela konversationshistoriken bifogad.

**4. Tvåvägs-synk**
Uppdateringar i Salesforce speglas i SWEO och vice versa. Agenter ser alltid den senaste informationen oavsett vilken plattform de jobbar i.

### Fördelar

- **Full kundkontext** — AI-agenten vet vem kunden är innan de ens ställer sin fråga
- **Automatisk ärendehantering** — Slipp manuell registrering av ärenden
- **Snabbare svar** — Agenten kan referera till orderstatus, fakturor och avtal direkt
- **Bättre rapportering** — All data samlas i Salesforce för analys och uppföljning

### Krav

- Salesforce Enterprise Edition eller högre
- SWEO Pro- eller Enterprise-plan
- Admin-behörighet i båda systemen`
  },
  {
    id: 'multichannel',
    badge: 'Nytt',
    badgeColor: 'bg-muted text-muted-foreground',
    title: 'Multichannel-support tillgängligt',
    description:
      'Hantera konversationer från chatt, e-post, WhatsApp och mer — allt från samma inkorg.',
    date: '5 feb',
    content: `## Multichannel-support

Hantera alla dina kundkonversationer från ett och samma ställe — oavsett om kunden kontaktar er via chatt, e-post, WhatsApp, SMS eller sociala medier.

### Stödda kanaler

- **Webbchatt** — Inbäddad widget på din webbplats
- **E-post** — Automatisk import och svar
- **WhatsApp** — Via Twilio Business API
- **SMS** — Tvåvägskommunikation
- **Instagram & Facebook** — Direktmeddelanden

### Enhetlig inkorg

Alla meddelanden samlas i en gemensam inkorg där du kan filtrera, prioritera och tilldela ärenden till rätt team.`
  },
  {
    id: 'knowledge-base',
    badge: 'Förbättring',
    badgeColor: 'bg-muted text-muted-foreground',
    title: 'Kunskapsbas med AI-förslag',
    description:
      'AI hittar nu luckor i din kunskapsbas och föreslår nytt innehåll automatiskt.',
    date: '28 jan',
    content: `## Kunskapsbas med AI-förslag

Vår AI analyserar kontinuerligt dina kundkonversationer och identifierar frågor som saknar svar i kunskapsbasen.

### Så fungerar det

1. AI:n övervakar alla konversationer som eskaleras till mänskliga agenter
2. Liknande frågor grupperas automatiskt
3. AI:n genererar ett utkast till hjälpartikel
4. Du granskar och publicerar med ett klick

### Resultat

Företag som aktiverat funktionen ser i snitt **23% högre resolution rate** inom 30 dagar.`
  }
];

function NewsTab() {
  const [selectedArticle, setSelectedArticle] = useState<
    (typeof NEWS_ITEMS)[number] | null
  >(null);

  if (selectedArticle) {
    return (
      <div className='flex flex-col'>
        {/* Article header */}
        <div className='border-border flex items-center gap-2 border-b px-4 py-3'>
          <button
            onClick={() => setSelectedArticle(null)}
            className='hover:bg-accent flex h-8 w-8 items-center justify-center rounded-full transition-colors'
          >
            <ArrowLeft
              className='text-muted-foreground h-[18px] w-[18px]'
              strokeWidth={2}
            />
          </button>
          <span className='text-foreground text-[14px] font-semibold'>
            Nyheter
          </span>
        </div>

        {/* Article image */}
        {'image' in selectedArticle && selectedArticle.image && (
          <div className='relative h-[180px] w-full overflow-hidden'>
            <Image
              src={selectedArticle.image}
              alt=''
              fill
              className='object-cover'
            />
          </div>
        )}

        {/* Article content */}
        <div className='px-5 py-5'>
          <div className='mb-3 flex items-center gap-2'>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                selectedArticle.badgeColor
              )}
            >
              {selectedArticle.badge}
            </span>
            <span className='text-muted-foreground text-[11px]'>
              {selectedArticle.date}
            </span>
          </div>

          <h2 className='text-foreground mb-4 text-[20px] leading-tight font-bold'>
            {selectedArticle.title}
          </h2>

          <div className='prose-sm text-foreground/80 text-[13.5px] leading-[1.7]'>
            {selectedArticle.content.split('\n\n').map((block, i) => {
              const trimmed = block.trim();
              if (trimmed.startsWith('### ')) {
                return (
                  <h4
                    key={i}
                    className='text-foreground mt-5 mb-2 text-[14px] font-bold'
                  >
                    {trimmed.slice(4)}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return null; // Skip top heading, already shown as title
              }
              if (trimmed.startsWith('- ')) {
                return (
                  <ul key={i} className='mb-3 space-y-1.5 pl-4'>
                    {trimmed.split('\n').map((line, j) => (
                      <li key={j} className='list-disc'>
                        {line
                          .replace(/^- /, '')
                          .split('**')
                          .map((part, k) =>
                            k % 2 === 1 ? (
                              <strong key={k} className='text-foreground'>
                                {part}
                              </strong>
                            ) : (
                              part
                            )
                          )}
                      </li>
                    ))}
                  </ul>
                );
              }
              if (/^\d+\./.test(trimmed)) {
                return (
                  <ol key={i} className='mb-3 space-y-1.5 pl-4'>
                    {trimmed.split('\n').map((line, j) => (
                      <li key={j} className='list-decimal'>
                        {line.replace(/^\d+\.\s*/, '')}
                      </li>
                    ))}
                  </ol>
                );
              }
              return (
                <p key={i} className='mb-3'>
                  {trimmed.split('**').map((part, k) =>
                    k % 2 === 1 ? (
                      <strong key={k} className='text-foreground'>
                        {part}
                      </strong>
                    ) : (
                      part
                    )
                  )}
                </p>
              );
            })}
          </div>

          {/* Author */}
          <div className='border-border mt-6 flex items-center gap-3 border-t pt-5'>
            <Image
              src='/team-member3.jpg'
              alt='Adam Hill'
              width={40}
              height={40}
              className='h-10 w-10 rounded-full object-cover'
            />
            <div>
              <p className='text-foreground text-[13px] font-semibold'>
                Adam Hill
              </p>
              <p className='text-muted-foreground text-[12px]'></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col'>
      {/* Header */}
      <div className='px-5 pt-5 pb-1'>
        <h2 className='text-foreground text-[17px] font-semibold'>Nyheter</h2>
      </div>

      {/* "Senaste" subheader */}
      <div className='flex items-center justify-between px-5 py-3'>
        <div>
          <p className='text-foreground text-[14px] font-semibold'>Senaste</p>
          <p className='text-muted-foreground text-[12px]'>Från teamet SWEO</p>
        </div>
        <div className='flex -space-x-2'>
          {['/team-cornelia.png', '/team-linnea.jpg', '/team-member3.jpg'].map(
            (src) => (
              <Image
                key={src}
                src={src}
                alt=''
                width={32}
                height={32}
                className='border-background h-8 w-8 rounded-full border-2 object-cover'
              />
            )
          )}
        </div>
      </div>

      {/* News cards */}
      <div className='space-y-4 px-5 pb-5'>
        {NEWS_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedArticle(item)}
            className={cn(
              'block w-full overflow-hidden rounded-xl text-left',
              'border-border border',
              'transition-all duration-100',
              'hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]',
              'active:scale-[0.995]'
            )}
          >
            {/* Image */}
            {'image' in item && item.image && (
              <div className='relative h-[160px] w-full overflow-hidden'>
                <Image src={item.image} alt='' fill className='object-cover' />
              </div>
            )}

            {/* Content */}
            <div className='px-4 py-3.5'>
              <div className='mb-2 flex items-center gap-2'>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                    item.badgeColor
                  )}
                >
                  {item.badge}
                </span>
                <span className='text-muted-foreground text-[11px]'>
                  {item.date}
                </span>
              </div>

              <p className='text-foreground text-[15px] leading-snug font-semibold'>
                {item.title}
              </p>
              <div className='mt-1 flex items-start gap-2'>
                <p className='text-muted-foreground flex-1 text-[13px] leading-snug'>
                  {item.description}
                </p>
                <ChevronRight className='text-muted-foreground/30 mt-0.5 h-4 w-4 shrink-0' />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Conversation Header ───────────────────────────────────────────────────
function ConversationHeader({
  department,
  onBack,
  onClose
}: {
  department: ChatDepartment | null;
  onBack: () => void;
  onClose: () => void;
}) {
  const deptInfo = department
    ? DEPARTMENTS.find((d) => d.id === department)
    : null;

  return (
    <div className='border-border flex items-center gap-3 border-b px-4 py-3'>
      <button
        onClick={onBack}
        className='text-muted-foreground hover:text-foreground hover:bg-accent -ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors'
        aria-label='Tillbaka'
      >
        <ArrowLeft className='h-[18px] w-[18px]' strokeWidth={2} />
      </button>

      <div className='flex min-w-0 flex-1 items-center gap-2.5'>
        <Image
          src='/logo-icon-light.svg'
          alt='SWEO'
          width={28}
          height={28}
          className='shrink-0 dark:hidden'
        />
        <Image
          src='/logo-icon-dark.svg'
          alt='SWEO'
          width={28}
          height={28}
          className='hidden shrink-0 dark:block'
        />
        <div className='min-w-0'>
          <p className='text-foreground text-[14px] leading-tight font-semibold'>
            {deptInfo?.label ?? 'SWEO'}
          </p>
          <p className='text-muted-foreground truncate text-[12px] leading-tight'>
            Teamet kan också hjälpa dig
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className='text-muted-foreground hover:text-foreground hover:bg-accent flex h-8 w-8 items-center justify-center rounded-full transition-colors'
        aria-label='Stäng'
      >
        <X className='h-[18px] w-[18px]' strokeWidth={2} />
      </button>
    </div>
  );
}

// ── Powered By ────────────────────────────────────────────────────────────
function PoweredBy() {
  return (
    <div className='mt-2.5 flex items-center justify-center gap-1.5'>
      <Image
        src='/logo-icon-light.svg'
        alt=''
        width={14}
        height={14}
        className='opacity-40 dark:hidden'
      />
      <Image
        src='/logo-icon-dark.svg'
        alt=''
        width={14}
        height={14}
        className='hidden opacity-40 dark:block'
      />
      <span className='text-muted-foreground/50 text-[11px]'>
        Powered by SWEO
      </span>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────
function MessageBubble({
  message,
  isLast,
  isStreaming
}: {
  message: ChatMessage;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const isUser = message.role === 'user';
  const timeLabel = formatTime(message.timestamp);

  return (
    <motion.div
      initial={isLast ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className='bg-muted mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full'>
          <Image
            src='/logo-icon-light.svg'
            alt='SWEO'
            width={18}
            height={18}
            className='dark:hidden'
          />
          <Image
            src='/logo-icon-dark.svg'
            alt='SWEO'
            width={18}
            height={18}
            className='hidden dark:block'
          />
        </div>
      )}

      <div className={cn('flex max-w-[78%] flex-col', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-[14px] leading-[1.55]',
            isUser
              ? 'bg-foreground text-background rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
          )}
        >
          {isStreaming && !message.content && (
            <span className='text-muted-foreground text-[14px]'>...</span>
          )}

          {message.content && (
            <span className='break-words whitespace-pre-wrap'>
              {message.content}
              {isStreaming && (
                <span className='ml-px inline-block h-3.5 w-[1.5px] translate-y-[2px] animate-pulse bg-current opacity-50' />
              )}
            </span>
          )}
        </div>

        <span className='text-muted-foreground/60 mt-1 px-1 text-[11px]'>
          {isUser ? timeLabel : `SWEO · AI Agent · ${timeLabel}`}
        </span>
      </div>
    </motion.div>
  );
}
