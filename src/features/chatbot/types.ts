/**
 * Types for the SWEO Customer Chat Widget.
 */

export type ChatDepartment = 'sales' | 'support';

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string | null;
  department: ChatDepartment | null;
  messages: ChatMessage[];
  isOpen: boolean;
  isTyping: boolean;
  userName: string | null;
  userEmail: string | null;
}

export interface DepartmentInfo {
  id: ChatDepartment;
  label: string;
  description: string;
  icon: string;
  greeting: string;
  availableHours: string;
}

export const DEPARTMENTS: DepartmentInfo[] = [
  {
    id: 'sales',
    label: 'Försäljning',
    description: 'Prata med vårt säljteam om produkter, priser och lösningar',
    icon: 'trending-up',
    greeting: 'Hej! Jag är här för att hjälpa dig. Hur kan jag hjälpa till?',
    availableHours: 'Mån–Fre 08:00–18:00'
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Få hjälp med tekniska frågor, felsökning och kontofrågor',
    icon: 'headphones',
    greeting: 'Hej! Hur kan jag hjälpa dig?',
    availableHours: 'Dygnet runt'
  }
];
