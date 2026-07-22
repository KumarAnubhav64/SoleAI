'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import type { ChatMessage } from '@/lib/types';

interface ChatContextValue {
  messages: ChatMessage[];
  isTyping: boolean;
  isComplete: boolean;
  title: string;
  /** Called by tabs to sync their chat state up to the context */
  syncChatState: (state: {
    messages: ChatMessage[];
    isTyping: boolean;
    isComplete: boolean;
    title: string;
  }) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [title, setTitle] = useState('Remote Expert');

  // Use a ref+callback to avoid stale closures in the sync function
  const stateRef = useRef({ messages, isTyping, isComplete, title });
  useEffect(() => {
    stateRef.current = { messages, isTyping, isComplete, title };
  }, [messages, isTyping, isComplete, title]);

  const syncChatState = useCallback(
    (state: { messages: ChatMessage[]; isTyping: boolean; isComplete: boolean; title: string }) => {
      const current = stateRef.current;
      if (
        current.messages === state.messages &&
        current.isTyping === state.isTyping &&
        current.isComplete === state.isComplete &&
        current.title === state.title
      ) {
        return; // No change — bail out to avoid re-renders
      }
      setMessages(state.messages);
      setIsTyping(state.isTyping);
      setIsComplete(state.isComplete);
      setTitle(state.title);
    },
    [],
  );

  return (
    <ChatContext.Provider value={{ messages, isTyping, isComplete, title, syncChatState }}>
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
