import { NavItem } from '@/types';

/**
 * Navigation configuration
 * Used by sidebar and Cmd+K bar.
 *
 * Primary navigation is the IconRail (src/components/layout/icon-rail.tsx).
 * This sidebar config provides secondary/sub-navigation within each section.
 */
export const navItems: NavItem[] = [
  {
    title: 'Overview',
    url: '/dashboard/overview',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['d', 'd'],
    items: []
  },
  {
    title: 'Inbox',
    url: '/dashboard/inbox',
    icon: 'conversations',
    shortcut: ['i', 'i'],
    isActive: false,
    items: []
  },
  {
    title: 'AI & Automation',
    url: '/dashboard/ai',
    icon: 'sparkles',
    shortcut: ['a', 'i'],
    isActive: false,
    items: []
  },
  {
    title: 'Reports',
    url: '/dashboard/reports',
    icon: 'analytics',
    shortcut: ['r', 'r'],
    isActive: false,
    items: [
      { title: 'Overview', url: '/dashboard/reports' },
      { title: 'Conversations', url: '/dashboard/reports/conversations' },
      {
        title: 'First response time',
        url: '/dashboard/reports/first-response'
      },
      { title: 'Resolution time', url: '/dashboard/reports/resolution-time' },
      { title: 'Customer satisfaction', url: '/dashboard/reports/csat' },
      {
        title: 'SWEO AI performance',
        url: '/dashboard/reports/fin-performance'
      },
      {
        title: 'Fin deflection rate',
        url: '/dashboard/reports/fin-deflection'
      },
      { title: 'Knowledge gaps', url: '/dashboard/reports/knowledge-gaps' },
      { title: 'Team performance', url: '/dashboard/reports/team-performance' },
      { title: 'Busiest hours', url: '/dashboard/reports/busiest-hours' },
      { title: 'Channels overview', url: '/dashboard/reports/channels' }
    ]
  },
  {
    title: 'Knowledge',
    url: '/dashboard/knowledge',
    icon: 'knowledge',
    shortcut: ['k', 's'],
    isActive: false,
    items: [
      { title: 'Sources', url: '/dashboard/knowledge' },
      { title: 'Policies', url: '/dashboard/policies' },
      { title: 'Procedures', url: '/dashboard/procedures' },
      { title: 'Connectors', url: '/dashboard/connectors' },
      { title: 'Testing', url: '/dashboard/testing' }
    ]
  },
  {
    title: 'Team',
    url: '/dashboard/contacts',
    icon: 'users',
    shortcut: ['c', 'c'],
    isActive: false,
    items: []
  },
  {
    title: 'Channels',
    url: '/dashboard/settings/channels/messenger',
    icon: 'conversations',
    isActive: false,
    items: [
      { title: 'Messenger', url: '/dashboard/settings/channels/messenger' },
      { title: 'Email', url: '/dashboard/settings/channels/email' },
      { title: 'Phone', url: '/dashboard/settings/channels/phone' },
      { title: 'WhatsApp', url: '/dashboard/settings/channels/whatsapp' },
      { title: 'SMS', url: '/dashboard/settings/channels/sms' }
    ]
  },
  {
    title: 'Workspace',
    url: '/dashboard/workspace/general',
    icon: 'workspace',
    isActive: false,
    items: [
      { title: 'General', url: '/dashboard/workspace/general' },
      { title: 'Teammates', url: '/dashboard/workspace/teammates' },
      { title: 'Security', url: '/dashboard/workspace/security' },
      { title: 'Brands', url: '/dashboard/workspace/brands' },
      { title: 'Multilingual', url: '/dashboard/workspace/multilingual' }
    ]
  },
  {
    title: 'Billing',
    url: '/dashboard/billing',
    icon: 'billing',
    isActive: false,
    items: []
  },
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: 'settings',
    shortcut: ['s', 's'],
    isActive: false,
    items: [
      { title: 'General', url: '/dashboard/settings/general' },
      { title: 'Security', url: '/dashboard/settings/security' },
      { title: 'Team', url: '/dashboard/settings/team' },
      { title: 'Customization', url: '/dashboard/settings/customization' },
      { title: 'API Tokens', url: '/dashboard/settings/api-tokens' }
    ]
  },
  {
    title: 'Documentation',
    url: '/docs',
    icon: 'knowledge',
    isActive: false,
    items: []
  }
];
