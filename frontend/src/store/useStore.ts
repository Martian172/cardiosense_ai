import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { User, ChatMessage } from '@/types';

interface AppStore {
  // Auth
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;

  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Chat / Agent
  sessionId: string;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  toggleChat: () => void;
  chatHistory: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  activeScanId: string | null;
  setActiveScanId: (id: string | null) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null, chatHistory: [], chatOpen: false }),

      // Sidebar
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // Chat
      sessionId: uuidv4(),
      chatOpen: false,
      setChatOpen: (chatOpen) => set({ chatOpen }),
      toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
      chatHistory: [],
      addMessage: (msg) => set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
      clearChat: () => set({ chatHistory: [], sessionId: uuidv4() }),
      activeScanId: null,
      setActiveScanId: (activeScanId) => set({ activeScanId }),
    }),
    {
      name: 'cardiosense-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        sidebarCollapsed: state.sidebarCollapsed,
        sessionId: state.sessionId,
        chatHistory: state.chatHistory,
      }),
    },
  ),
);
