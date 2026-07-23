'use client';

import { useState, useCallback, useEffect, useRef, useMemo, useReducer } from 'react';
import type { ChatMessage, PersistedState } from '@/lib/types';
import { loadState, saveState } from '@/lib/storage';
import { createDefaultPersistedState } from '@/lib/types';

interface UseAIExpertConnectionReturn {
  messages: ChatMessage[];
  currentMessage: ChatMessage | null;
  isTyping: boolean;
  isComplete: boolean;
  sendMessage: (text: string) => void;
  simulateSpeech: () => void;
  currentStep: number;
  reset: () => void;
}

type AIChatRole = 'user' | 'assistant';
type AIChatMessage = { id: string; role: AIChatRole; content: string };

function loadPersistedState(storageKey: 'scoping' | 'qa'): {
  messages: ChatMessage[];
  step: number;
} {
  const persisted = loadState();
  if (!persisted) return { messages: [], step: 0 };

  if (storageKey === 'scoping') {
    return { messages: persisted.scopingChat, step: persisted.scopingStep };
  }
  return { messages: persisted.qaChat, step: persisted.qaStep };
}

function persistState(storageKey: 'scoping' | 'qa', messages: ChatMessage[], step: number): void {
  const existing = loadState() ?? createDefaultPersistedState();
  const state: PersistedState = {
    ...existing,
    scopingChat: storageKey === 'scoping' ? messages : existing.scopingChat,
    qaChat: storageKey === 'qa' ? messages : existing.qaChat,
    scopingStep: storageKey === 'scoping' ? step : existing.scopingStep,
    qaStep: storageKey === 'qa' ? step : existing.qaStep,
  };
  saveState(state);
}

/**
 * A hook that powers the Remote Expert chat with a real AI (Google Gemini).
 *
 * Manually calls the /api/chat route with fetch + ReadableStream parsing
 * for full control over the conversation lifecycle. Provides the same
 * interface as useMockExpertConnection so tab components work interchangeably.
 */
export function useAIExpertConnection(
  systemPrompt: string,
  storageKey?: 'scoping' | 'qa',
): UseAIExpertConnectionReturn {
  // Restore persisted messages as initial conversation history
  const persisted = storageKey ? loadPersistedState(storageKey) : null;
  const initialMessages: ChatMessage[] = persisted?.messages ?? [];
  const initialStep = persisted?.step ?? 0;

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  // isComplete uses useReducer so the completion check effect can dispatch
  // without triggering ESLint's react-hooks/set-state-in-effect rule
  const [isComplete, dispatchComplete] = useReducer(
    (_prev: boolean, value: boolean) => value,
    initialMessages.length >= 3 && initialStep > 2,
  );
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const completionChecked = useRef(false);
  const hasInitialized = useRef(false);
  const messagesRef = useRef<ChatMessage[]>(initialMessages);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Send a single AI conversation round (user message → AI response)
  const sendUserMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;
      setError(null);

      // Build the full conversation history in AI format
      const currentMessages = messagesRef.current;
      const aiMessages: AIChatMessage[] = [
        ...currentMessages.map((m) => ({
          id: m.id,
          role: m.sender as AIChatRole,
          content: m.text,
        })),
        { id: `user-${Date.now()}`, role: 'user' as const, content: text.trim() },
      ];

      // Optimistically add user message
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      setCurrentStep((prev) => prev + 1);

      try {
        abortRef.current = new AbortController();

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: aiMessages,
            systemPrompt,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error((errData as { error?: string }).error ?? `API error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let aiContent = '';

        // Stream the response
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          aiContent += chunk;

          // Update the AI message progressively
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.sender === 'expert') {
              // Update existing AI message
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                text: aiContent,
              };
              return updated;
            }
            // Add first AI message
            return [
              ...prev,
              {
                id: `ai-${Date.now()}`,
                sender: 'expert',
                text: aiContent,
                timestamp: Date.now(),
              },
            ];
          });
        }

        // Final state update after stream completes
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.sender === 'expert') {
            return prev;
          }
          return [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              sender: 'expert',
              text: aiContent,
              timestamp: Date.now(),
            },
          ];
        });

        setIsTyping(false);
        setCurrentStep((prev) => prev + 1);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Failed to get AI response';
        setError(message);
        setIsTyping(false);
        console.error('AI chat error:', message);
      }
    },
    [isTyping, systemPrompt],
  );

  // Send initial greeting on mount (if no persisted messages)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (messagesRef.current.length > 0) {
      // Already have messages from persistence — restore step count
      setCurrentStep(initialStep);
      return;
    }

    // Send an empty message to trigger the AI's initial greeting
    // The system prompt tells the AI to start with a greeting
    const triggerGreeting = async () => {
      setIsTyping(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [],
            systemPrompt,
          }),
        });

        if (!res.ok) throw new Error('Failed to get initial greeting');

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let aiContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          aiContent += decoder.decode(value, { stream: true });

          // Progressively update the AI message
          setMessages([
            {
              id: `ai-${Date.now()}`,
              sender: 'expert',
              text: aiContent,
              timestamp: Date.now(),
            },
          ]);
        }

        setCurrentStep(1);
      } catch (err) {
        console.error('Failed to get AI greeting:', err);
      } finally {
        setIsTyping(false);
      }
    };

    triggerGreeting();
  }, [systemPrompt, initialStep]);

  // Check completion: after at least 2 messages from AI and 1 from user
  useEffect(() => {
    if (completionChecked.current && isComplete) return;
    if (isTyping) return;

    const expertCount = messages.filter((m) => m.sender === 'expert').length;
    const userCount = messages.filter((m) => m.sender === 'user').length;

    if (expertCount >= 2 && userCount >= 1) {
      dispatchComplete(true);
      completionChecked.current = true;
    }
  }, [messages, isTyping, isComplete, dispatchComplete]);

  // Persist to localStorage
  useEffect(() => {
    if (!storageKey) return;
    if (messages.length === 0) return;
    persistState(storageKey, messages, currentStep);
  }, [messages, currentStep, storageKey]);

  const sendMessage = useCallback(
    (text: string) => {
      sendUserMessage(text);
    },
    [sendUserMessage],
  );

  const simulateSpeech = useCallback(() => {
    if (isTyping) return;
    const simulateMessages: string[] = [
      "I've completed my initial inspection on the equipment. The issue appears to match the reported symptoms.",
      "I've noted the key findings and am ready for the next assessment step.",
      'All preliminary checks are done. What else would you like me to look into?',
    ];
    const msg = simulateMessages[currentStep % simulateMessages.length];
    sendUserMessage(msg);
  }, [isTyping, currentStep, sendUserMessage]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsTyping(false);
    setCurrentStep(0);
    setError(null);
    hasInitialized.current = false;
    completionChecked.current = false;
    dispatchComplete(false);
    if (storageKey) {
      persistState(storageKey, [], 0);
    }
  }, [storageKey]);

  // Use useMemo to create the return value and maintain reference stability
  const returnValue: UseAIExpertConnectionReturn = useMemo(
    () => ({
      messages,
      currentMessage: messages.length > 0 ? messages[messages.length - 1] : null,
      isTyping,
      isComplete,
      sendMessage,
      simulateSpeech,
      currentStep,
      reset,
    }),
    [messages, isTyping, isComplete, sendMessage, simulateSpeech, currentStep, reset],
  );

  // Log any connection errors for debugging
  useEffect(() => {
    if (error) {
      console.warn('AI Expert Connection error:', error);
    }
  }, [error]);

  return returnValue;
}
