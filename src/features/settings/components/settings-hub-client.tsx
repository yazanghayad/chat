'use client';

import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  Building2,
  CreditCard,
  Globe,
  Headphones,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Tag,
  UserCog,
  Users,
  Webhook,
  Languages,
  Bot,
  Zap,
  Database,
  Key,
  Bell,
  Palette
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SettingsCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SettingsSection {
  title: string;
  cards: SettingsCard[];
}

const settingsSections: SettingsSection[] = [
  {
    title: 'Workspace',
    cards: [
      {
        title: 'General',
        description: 'Workspace name, timezone, and default language',
        href: '/dashboard/settings/general',
        icon: Building2
      },
      {
        title: 'Teammates',
        description: 'Manage team members, roles, and permissions',
        href: '/dashboard/settings/team',
        icon: Users
      },
      {
        title: 'Security',
        description:
          'Authentication methods, IP allowlists, and session settings',
        href: '/dashboard/settings/security',
        icon: Shield
      },
      {
        title: 'Brands',
        description: 'Manage brand identity and messaging tone',
        href: '/dashboard/settings/customization',
        icon: Palette
      },
      {
        title: 'Multilingual',
        description: 'Configure supported languages and translations',
        href: '/dashboard/settings/languages',
        icon: Languages
      }
    ]
  },
  {
    title: 'Subscription',
    cards: [
      {
        title: 'Billing',
        description: 'Manage your plan, invoices, and payment methods',
        href: '/dashboard/settings/billing',
        icon: CreditCard
      }
    ]
  },
  {
    title: 'Channels',
    cards: [
      {
        title: 'Messenger',
        description: 'Configure the web chat messenger widget',
        href: '/dashboard/settings/channels/messenger',
        icon: MessageSquare
      },
      {
        title: 'Email',
        description: 'Set up email addresses and forwarding rules',
        href: '/dashboard/settings/channels/email',
        icon: Mail
      },
      {
        title: 'Phone',
        description: 'Configure voice and phone call settings',
        href: '/dashboard/settings/channels/phone',
        icon: Phone
      },
      {
        title: 'WhatsApp',
        description: 'Connect and manage WhatsApp Business',
        href: '/dashboard/settings/channels/whatsapp',
        icon: MessageSquare
      },
      {
        title: 'SMS',
        description: 'Set up SMS messaging and phone numbers',
        href: '/dashboard/settings/channels/sms',
        icon: Headphones
      }
    ]
  },
  {
    title: 'Inbox',
    cards: [
      {
        title: 'Team Inboxes',
        description: 'Create and manage team-based inbox routing',
        href: '/dashboard/settings/inboxes',
        icon: MessageSquare
      },
      {
        title: 'Assignments',
        description: 'Configure auto-assignment and round-robin rules',
        href: '/dashboard/settings/assignments',
        icon: UserCog
      },
      {
        title: 'Macros',
        description: 'Create saved reply templates and macros',
        href: '/dashboard/settings/macros',
        icon: Zap
      },
      {
        title: 'Tags',
        description: 'Manage conversation tags and labels',
        href: '/dashboard/settings/tags',
        icon: Tag
      }
    ]
  },
  {
    title: 'AI & Automation',
    cards: [
      {
        title: 'SWEO AI Agent',
        description: 'Configure AI agent behavior, personality, and training',
        href: '/dashboard/settings/ai-agent',
        icon: Bot
      },
      {
        title: 'Inbox AI',
        description: 'Enable AI compose, summarize, and autofill features',
        href: '/dashboard/settings/inbox-ai',
        icon: Sparkles
      },
      {
        title: 'Automation',
        description: 'Build workflow automations and routing rules',
        href: '/dashboard/settings/automation',
        icon: Zap
      }
    ]
  },
  {
    title: 'Integrations',
    cards: [
      {
        title: 'Data Connectors',
        description: 'Connect to Shopify, Stripe, Salesforce, and more',
        href: '/dashboard/connectors',
        icon: Database
      },
      {
        title: 'Webhooks',
        description: 'Configure webhook endpoints for real-time events',
        href: '/dashboard/settings/webhooks',
        icon: Webhook
      },
      {
        title: 'API & Tokens',
        description: 'Manage API keys and access tokens',
        href: '/dashboard/settings/api-tokens',
        icon: Key
      }
    ]
  },
  {
    title: 'Personal',
    cards: [
      {
        title: 'Your Details',
        description: 'Manage your personal profile and preferences',
        href: '/dashboard/settings/profile',
        icon: Settings
      },
      {
        title: 'Notifications',
        description: 'Configure notification channels and preferences',
        href: '/dashboard/settings/notifications',
        icon: Bell
      },
      {
        title: 'Account Security',
        description: 'Manage your password and two-factor authentication',
        href: '/dashboard/settings/account-security',
        icon: Lock
      }
    ]
  }
];

export default function SettingsHubClient() {
  const [search, setSearch] = useState('');

  const filteredSections = settingsSections
    .map((section) => ({
      ...section,
      cards: section.cards.filter(
        (card) =>
          card.title.toLowerCase().includes(search.toLowerCase()) ||
          card.description.toLowerCase().includes(search.toLowerCase())
      )
    }))
    .filter((section) => section.cards.length > 0);

  return (
    <div className='space-y-8'>
      {/* Search */}
      <div className='relative max-w-md'>
        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
        <Input
          placeholder='Search settings...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='pl-9'
        />
      </div>

      {/* Sections */}
      {filteredSections.map((section) => (
        <div key={section.title}>
          <h3 className='text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase'>
            {section.title}
          </h3>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {section.cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className={cn(
                    'group flex items-start gap-3 rounded-lg border p-4 transition-all',
                    'hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm'
                  )}
                >
                  <div className='bg-muted group-hover:bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors'>
                    <Icon className='text-muted-foreground group-hover:text-primary h-4.5 w-4.5 transition-colors' />
                  </div>
                  <div className='min-w-0'>
                    <p className='text-sm font-medium'>{card.title}</p>
                    <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                      {card.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
