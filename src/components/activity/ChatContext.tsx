'use client';

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { ChatMessage } from '@/lib/types';

export type ActiveSection = 'scoping' | 'repair' | 'qa';

interface ChatContextValue {
  /** Accumulated messages from scoping + QA combined into one full transcript */
  accumulatedMessages: ChatMessage[];
  /** Whether the currently active conversation tab is showing a typing indicator */
  isTyping: boolean;
  /** Current section label shown in the right panel header */
  title: string;
  /** Sync scoping tab's chat state */
  syncScopingState: (state: {
    messages: ChatMessage[];
    isTyping: boolean;
    isComplete: boolean;
  }) => void;
  /** Sync QA tab's chat state */
  syncQAState: (state: { messages: ChatMessage[]; isTyping: boolean; isComplete: boolean }) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [scopingMessages, setScopingMessages] = useState<ChatMessage[]>([]);
  const [scopingIsTyping, setScopingIsTyping] = useState(false);

  const [qaMessages, setQaMessages] = useState<ChatMessage[]>([]);
  const [qaIsTyping, setQaIsTyping] = useState(false);

  const [activeSection, setActiveSection] = useState<ActiveSection>('scoping');

  // Accumulated transcript: scoping first, then QA
  const accumulatedMessages = useMemo(
    () => [...scopingMessages, ...qaMessages],
    [scopingMessages, qaMessages],
  );

  // Typing indicator follows whichever section is currently active
  const isTyping = activeSection === 'scoping' ? scopingIsTyping : qaIsTyping;

  // Title reflects the active section
  const title =
    activeSection === 'scoping'
      ? 'Scoping Assessment'
      : activeSection === 'qa'
        ? 'Quality Assurance'
        : 'Remote Expert';

  const syncScopingState = useCallback(
    (state: { messages: ChatMessage[]; isTyping: boolean; isComplete: boolean }) => {
      setScopingMessages(state.messages);
      setScopingIsTyping(state.isTyping);
      setActiveSection('scoping');
    },
    [],
  );

  const syncQAState = useCallback(
    (state: { messages: ChatMessage[]; isTyping: boolean; isComplete: boolean }) => {
      setQaMessages(state.messages);
      setQaIsTyping(state.isTyping);
      setActiveSection('qa');
    },
    [],
  );

  return (
    <ChatContext.Provider
      value={{
        accumulatedMessages,
        isTyping,
        title,
        syncScopingState,
        syncQAState,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return ctx;
}
