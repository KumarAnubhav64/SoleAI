'use client';

import { useState, useCallback, useEffect, useRef, useMemo, useReducer } from 'react';
import { toast } from 'sonner';
import type { ChatMessage, PersistedState } from '@/lib/types';
import { loadState, saveState } from '@/lib/storage';
import { createDefaultPersistedState } from '@/lib/types';
import { MOCK_EXPERT_DELAY_MIN, MOCK_EXPERT_DELAY_MAX } from '@/lib/constants';

interface UseAIExpertConnectionReturn {
  messages: ChatMessage[];
  currentMessage: ChatMessage | null;
  isTyping: boolean;
  isComplete: boolean;
  sendMessage: (text: string) => void;
  simulateSpeech: () => void;
  currentStep: number;
  reset: () => void;
  isFallback: boolean;
}

type AIChatRole = 'user' | 'assistant';
type AIChatMessage = { id: string; role: AIChatRole; content: string };

function getRandomDelay(): number {
  return (
    Math.floor(Math.random() * (MOCK_EXPERT_DELAY_MAX - MOCK_EXPERT_DELAY_MIN + 1)) +
    MOCK_EXPERT_DELAY_MIN
  );
}

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
 * A hook that powers the Remote Expert chat with a real AI (Google Gemini),
 * with automatic fallback to script-based mock responses when the AI is
 * unavailable, rate-limited, or returns an error.
 *
 * - Primary mode: calls /api/chat with fetch + ReadableStream parsing
 * - Fallback mode: emits expert messages from fallbackScript with 1.5-3s delays
 * - Shows a toast notification when falling back
 */
export function useAIExpertConnection(
  systemPrompt: string,
  storageKey?: 'scoping' | 'qa',
  fallbackScript?: ChatMessage[],
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
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackScriptStep, setFallbackScriptStep] = useState(initialStep);

  const abortRef = useRef<AbortController | null>(null);
  const completionChecked = useRef(false);
  const hasInitialized = useRef(false);
  const hasShownFallbackToast = useRef(false);
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptRef = useRef(fallbackScript);

  // Sync script ref when the script changes
  useEffect(() => {
    scriptRef.current = fallbackScript;
  }, [fallbackScript]);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Cleanup fallback timer on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  // ─── Fallback mode: emit the next expert message from the script ───
  const scheduleFallbackExpertEmission = useCallback((scriptStep: number) => {
    const script = scriptRef.current;
    if (!script || scriptStep >= script.length) return;
    if (script[scriptStep]?.sender !== 'expert') return;

    setIsTyping(true);

    const delay = getRandomDelay();
    fallbackTimerRef.current = setTimeout(() => {
      const message = script[scriptStep];
      setMessages((prev) => [...prev, { ...message, timestamp: Date.now() }]);
      setIsTyping(false);
      setFallbackScriptStep((prev) => prev + 1);
    }, delay);
  }, []);

  // In fallback mode, auto-emit expert messages from the script when at an expert step
  useEffect(() => {
    if (!useFallback) return;

    const script = scriptRef.current;
    if (!script || fallbackScriptStep >= script.length) {
      // Script exhausted — mark complete
      dispatchComplete(true);
      completionChecked.current = true;
      return;
    }

    const sender = script[fallbackScriptStep]?.sender;
    if (sender === 'expert') {
      scheduleFallbackExpertEmission(fallbackScriptStep);
    }
    // If sender is 'user', wait for sendMessage / simulateSpeech
  }, [useFallback, fallbackScriptStep, scheduleFallbackExpertEmission]);

  // ─── Send a user message (AI mode) ───
  const sendAIMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;
      setError(null);

      const currentMessages = messagesRef.current;
      const aiMessages: AIChatMessage[] = [
        ...currentMessages.map((m) => ({
          id: m.id,
          // Map our internal 'expert' role to Gemini's 'assistant' role
          role: m.sender === 'expert' ? ('assistant' as const) : ('user' as const),
          content: m.text,
        })),
        { id: `user-${Date.now()}`, role: 'user' as const, content: text.trim() },
      ];

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
          body: JSON.stringify({ messages: aiMessages, systemPrompt }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const err = errData as { error?: string; message?: string };
          throw new Error(err.message ?? `API error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let aiContent = '';
        let expertMsgId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          aiContent += chunk;

          if (!expertMsgId) {
            expertMsgId = `ai-${Date.now()}`;
          }

          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.sender === 'expert' && last.id === expertMsgId) {
              const updated = [...prev];
              updated[updated.length - 1] = { ...last, text: aiContent };
              return updated;
            }
            return [
              ...prev,
              { id: expertMsgId!, sender: 'expert', text: aiContent, timestamp: Date.now() },
            ];
          });
        }

        // Ensure the final AI message exists in state
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.sender === 'expert' && last.id === expertMsgId) return prev;
          return [
            ...prev,
            {
              id: expertMsgId ?? `ai-${Date.now()}`,
              sender: 'expert',
              text: aiContent,
              timestamp: Date.now(),
            },
          ];
        });

        setIsTyping(false);
        setCurrentStep((prev) => prev + 1);

        // Detect if the streamed content is actually an error message
        // (happens when streamText throws after the response already started streaming).
        // Use precise patterns to avoid false positives on legitimate AI responses.
        const looksLikeError =
          aiContent.startsWith('Error [AI_') ||
          aiContent.startsWith('AI_InvalidPromptError') ||
          aiContent.startsWith('AI_TypeValidationError') ||
          aiContent.includes('InvalidPromptError') ||
          aiContent.includes('TypeValidationError');

        if (looksLikeError && fallbackScript) {
          console.warn(
            'AI stream returned error content, switching to fallback:',
            aiContent.slice(0, 100),
          );
          if (!hasShownFallbackToast.current) {
            hasShownFallbackToast.current = true;
            toast.warning('AI returned an error. Using pre-configured responses as fallback.', {
              duration: 5000,
            });
          }
          // Remove the error message from chat and switch to fallback
          const msgId = expertMsgId;
          if (msgId) {
            setMessages((prev) => prev.filter((m) => m.id !== msgId));
          }
          setUseFallback(true);
          // Skip past the first script greeting if AI already sent one
          const hasExistingExpert = messagesRef.current.some((m) => m.sender === 'expert');
          if (hasExistingExpert && fallbackScript[0]?.sender === 'expert') {
            setFallbackScriptStep(1);
          }
          return; // Don't persist the error
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Failed to get AI response';
        setError(message);
        setIsTyping(false);
        console.error('AI chat error:', message);

        // Switch to fallback mode if script is available
        if (fallbackScript && !useFallback) {
          if (!hasShownFallbackToast.current) {
            hasShownFallbackToast.current = true;
            toast.warning(
              'Remote Expert AI unavailable. Using pre-configured responses as fallback.',
              { duration: 5000 },
            );
          }
          // Advance past the first script greeting if AI already sent one
          const hasExistingExpert = messagesRef.current.some((m) => m.sender === 'expert');
          if (hasExistingExpert && fallbackScript[0]?.sender === 'expert') {
            setFallbackScriptStep(1);
          }
          setUseFallback(true);
        }
      }
    },
    [isTyping, systemPrompt, fallbackScript, useFallback],
  );

  // ─── Handle user message in either mode ───
  const sendUserMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isTyping) return;

      if (useFallback) {
        // Fallback mode: use script-based response
        const script = scriptRef.current;
        if (!script) return;
        if (fallbackScriptStep >= script.length) return;

        const sender = script[fallbackScriptStep]?.sender;
        if (sender !== 'user') return;

        const message: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: text.trim(),
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, message]);
        setFallbackScriptStep((prev) => prev + 1);
      } else {
        // AI mode
        sendAIMessage(text);
      }
    },
    [isTyping, useFallback, fallbackScriptStep, sendAIMessage],
  );

  // ─── Initial greeting on mount ───
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (messagesRef.current.length > 0) {
      setCurrentStep(initialStep);
      return;
    }

    const triggerGreeting = async () => {
      setIsTyping(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [], systemPrompt }),
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

        // Fall back to script greeting
        if (fallbackScript && fallbackScript.length > 0 && !useFallback) {
          if (!hasShownFallbackToast.current) {
            hasShownFallbackToast.current = true;
            toast.warning(
              'Remote Expert AI unavailable. Using pre-configured responses as fallback.',
              { duration: 5000 },
            );
          }
          setUseFallback(true);
          // Emit the first expert message from the script
          const firstExpertMsg = fallbackScript.find((m) => m.sender === 'expert');
          if (firstExpertMsg) {
            setMessages([{ ...firstExpertMsg, timestamp: Date.now() }]);
            const firstExpertIdx = fallbackScript.indexOf(firstExpertMsg);
            setFallbackScriptStep(firstExpertIdx + 1);
          }
        } else {
          // No fallback available — show a generic greeting
          setMessages([
            {
              id: 'ai-fallback',
              sender: 'expert',
              text: 'Connection issue detected. Please try sending a message to reconnect.',
              timestamp: Date.now(),
            },
          ]);
        }
      } finally {
        setIsTyping(false);
      }
    };

    triggerGreeting();
  }, [systemPrompt, initialStep, fallbackScript, useFallback]);

  // ─── Completion check ───
  useEffect(() => {
    if (completionChecked.current && isComplete) return;
    if (isTyping) return;

    if (useFallback) {
      // In fallback mode, mark complete when the fallback script is exhausted
      const script = scriptRef.current;
      if (script && fallbackScriptStep >= script.length) {
        dispatchComplete(true);
        completionChecked.current = true;
      }
    } else {
      // AI mode: mark complete after a meaningful exchange
      // (AI greeting + user reply + AI response + user reply + AI wrap-up)
      const expertCount = messages.filter((m) => m.sender === 'expert').length;
      const userCount = messages.filter((m) => m.sender === 'user').length;

      if (expertCount >= 3 && userCount >= 2) {
        dispatchComplete(true);
        completionChecked.current = true;
      }
    }
  }, [messages, isTyping, isComplete, useFallback, fallbackScriptStep, dispatchComplete]);

  // ─── Persist to localStorage ───
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

    if (useFallback) {
      // Fallback mode: pull the next user message from the script
      const script = scriptRef.current;
      if (!script) return;
      if (fallbackScriptStep >= script.length) return;
      const scriptMessage = script[fallbackScriptStep];
      if (scriptMessage?.sender !== 'user') return;
      sendUserMessage(scriptMessage.text);
    } else {
      // AI mode: send a generic context message
      const simulateMessages: string[] = [
        "I've completed my initial inspection on the equipment. The issue appears to match the reported symptoms.",
        "I've noted the key findings and am ready for the next assessment step.",
        'All preliminary checks are done. What else would you like me to look into?',
      ];
      const msg = simulateMessages[currentStep % simulateMessages.length];
      sendUserMessage(msg);
    }
  }, [isTyping, useFallback, fallbackScriptStep, currentStep, sendUserMessage]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setMessages([]);
    setIsTyping(false);
    setCurrentStep(0);
    setError(null);
    setUseFallback(false);
    setFallbackScriptStep(0);
    hasInitialized.current = false;
    completionChecked.current = false;
    hasShownFallbackToast.current = false;
    dispatchComplete(false);
    if (storageKey) {
      persistState(storageKey, [], 0);
    }
  }, [storageKey]);

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
      isFallback: useFallback,
    }),
    [messages, isTyping, isComplete, sendMessage, simulateSpeech, currentStep, reset, useFallback],
  );

  useEffect(() => {
    if (error) {
      console.warn('AI Expert Connection error:', error);
    }
  }, [error]);

  return returnValue;
}
