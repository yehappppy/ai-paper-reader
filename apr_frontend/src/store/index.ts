import { create } from "zustand";
import type { Paper, PaperDetails, ChatMessage, ChatSession } from "@/lib/types";

interface PapersState {
  papers: Paper[];
  currentPaper: PaperDetails | null;
  isLoading: boolean;
  error: string | null;
  setPapers: (papers: Paper[]) => void;
  setCurrentPaper: (paper: PaperDetails | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addPaper: (paper: Paper) => void;
  removePaper: (paperId: string) => void;
}

export const usePapersStore = create<PapersState>((set) => ({
  papers: [],
  currentPaper: null,
  isLoading: false,
  error: null,
  setPapers: (papers) => set({ papers }),
  setCurrentPaper: (paper) => set({ currentPaper: paper }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  addPaper: (paper) => set((state) => ({ papers: [...state.papers, paper] })),
  removePaper: (paperId) =>
    set((state) => ({
      papers: state.papers.filter((p) => p.id !== paperId),
    })),
}));

interface NotesState {
  content: string;
  isSaving: boolean;
  lastSaved: number | null;
  setContent: (content: string) => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (timestamp: number) => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  content: "",
  isSaving: false,
  lastSaved: null,
  setContent: (content) => set({ content }),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSaved: (lastSaved) => set({ lastSaved }),
}));

interface ChatState {
  sessions: Record<string, ChatSession>;
  currentSessionId: string | null;
  isOpen: boolean;
  isLoading: boolean;
  createSession: (paperId: string) => string;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  setCurrentSession: (sessionId: string | null) => void;
  setOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  getCurrentSession: () => ChatSession | null;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: {},
  currentSessionId: null,
  isOpen: false,
  isLoading: false,

  createSession: (paperId: string) => {
    const sessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: sessionId,
      paperId,
      messages: [],
    };
    set((state) => ({
      sessions: { ...state.sessions, [sessionId]: newSession },
      currentSessionId: sessionId,
    }));
    return sessionId;
  },

  addMessage: (sessionId: string, message: ChatMessage) => {
    set((state) => {
      const session = state.sessions[sessionId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages: [...session.messages, message],
          },
        },
      };
    });
  },

  setCurrentSession: (sessionId: string | null) => set({ currentSessionId: sessionId }),
  setOpen: (isOpen: boolean) => set({ isOpen }),
  setLoading: (isLoading: boolean) => set({ isLoading }),

  getCurrentSession: () => {
    const state = get();
    if (!state.currentSessionId) return null;
    return state.sessions[state.currentSessionId] || null;
  },
}));

interface UIState {
  sidebarOpen: boolean;
  themeToggleOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setThemeToggleOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  themeToggleOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setThemeToggleOpen: (themeToggleOpen) => set({ themeToggleOpen }),
}));
