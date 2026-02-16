'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage, ChatDepartment } from './types';

interface ChatbotState {
  isOpen: boolean;
  showDepartmentPicker: boolean;
  activeTab: 'home' | 'messages' | 'help' | 'news';
  department: ChatDepartment | null;
  messages: ChatMessage[];
  conversationId: string | null;
  isStreaming: boolean;
  userName: string;
  userEmail: string;
  hasStartedConversation: boolean;

  // Actions
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setActiveTab: (tab: 'home' | 'messages' | 'help' | 'news') => void;
  setDepartment: (dept: ChatDepartment) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setConversationId: (id: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setUserInfo: (name: string, email: string) => void;
  setHasStartedConversation: (started: boolean) => void;
  resetChat: () => void;
}

export const useChatbotStore = create<ChatbotState>()(
  persist(
    (set) => ({
      isOpen: false,
      showDepartmentPicker: true,
      activeTab: 'home',
      department: null,
      messages: [],
      conversationId: null,
      isStreaming: false,
      userName: '',
      userEmail: '',
      hasStartedConversation: false,

      toggleOpen: () =>
        set((s) => ({
          isOpen: !s.isOpen,
          ...(!s.isOpen ? { activeTab: 'home' as const } : {})
        })),
      setOpen: (open) =>
        set({ isOpen: open, ...(open ? { activeTab: 'home' as const } : {}) }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      setDepartment: (dept) =>
        set({ department: dept, showDepartmentPicker: false }),

      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

      updateLastAssistantMessage: (content) =>
        set((s) => {
          const msgs = [...s.messages];
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'assistant') {
              msgs[i] = { ...msgs[i], content };
              break;
            }
          }
          return { messages: msgs };
        }),

      setConversationId: (id) => set({ conversationId: id }),
      setIsStreaming: (streaming) => set({ isStreaming: streaming }),

      setUserInfo: (name, email) => set({ userName: name, userEmail: email }),

      setHasStartedConversation: (started) =>
        set({ hasStartedConversation: started }),

      resetChat: () =>
        set({
          department: null,
          showDepartmentPicker: true,
          activeTab: 'home',
          messages: [],
          conversationId: null,
          isStreaming: false,
          hasStartedConversation: false
        })
    }),
    {
      name: 'sweo-chatbot',
      partialize: (state) => ({
        department: state.department,
        messages: state.messages,
        conversationId: state.conversationId,
        userName: state.userName,
        userEmail: state.userEmail,
        hasStartedConversation: state.hasStartedConversation,
        showDepartmentPicker: state.showDepartmentPicker
      })
    }
  )
);
