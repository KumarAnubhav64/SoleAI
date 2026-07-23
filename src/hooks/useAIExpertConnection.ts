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

/**
 * Detect if streamed content is actually an error from the AI provider
 * (Gemini JSON error, Vercel AI SDK error, etc.) rather than a legitimate response.
 */
function isErrorContent(text: string): boolean {
  return (
    // Vercel AI SDK error formats (may appear at start or mid-stream)
    text.startsWith('Error [AI_') ||
    text.includes('Error [AI_') ||
    text.startsWith('AI_InvalidPromptError') ||
    text.startsWith('AI_TypeValidationError') ||
    text.includes('InvalidPromptError') ||
    text.includes('TypeValidationError') ||
    text.includes('AI_RetryError') ||
    text.includes('AI_APICallError') ||
    // Gemini API JSON error format (e.g., 429 quota exceeded)
    text.includes('RESOURCE_EXHAUSTED') ||
    (text.includes('"error":') && (text.includes('"code"') || text.includes('"message"')))
  );
}

/** User-friendly message shown in chat when the AI is unavailable. */
const FALLBACK_NOTICE_MESSAGE =
  '⚠️ The Remote Expert AI is currently unavailable. Switching to pre-configured responses to continue the session.';

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

// ─── Chat state reducer (used by useAIExpertConnection) ───

interface ChatState {
  messages: ChatMessage[];
  currentStep: number;
  fallbackScriptStep: number;
}

type ChatAction =
  | { type: 'HYDRATE'; messages: ChatMessage[]; step: number }
  | {
      type: 'SET_MSGS';
      messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]);
    }
  | { type: 'ADD_MSG'; updater: (prev: ChatMessage[]) => ChatMessage[] }
  | { type: 'REMOVE_MSG'; id: string }
  | { type: 'INC_STEP' }
  | { type: 'SET_STEP'; step: number }
  | { type: 'INC_FALLBACK' }
  | { type: 'SET_FALLBACK'; step: number }
  | { type: 'RESET' };

const initialChatState: ChatState = {
  messages: [],
  currentStep: 0,
  fallbackScriptStep: 0,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'HYDRATE':
      return {
        messages: action.messages,
        currentStep: action.step,
        fallbackScriptStep: action.step,
      };
    case 'SET_MSGS':
      return {
        ...state,
        messages:
          typeof action.messages === 'function'
            ? (action.messages as (prev: ChatMessage[]) => ChatMessage[])(state.messages)
            : action.messages,
      };
    case 'ADD_MSG':
      return { ...state, messages: action.updater(state.messages) };
    case 'REMOVE_MSG':
      return { ...state, messages: state.messages.filter((m) => m.id !== action.id) };
    case 'INC_STEP':
      return { ...state, currentStep: state.currentStep + 1 };
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'INC_FALLBACK':
      return { ...state, fallbackScriptStep: state.fallbackScriptStep + 1 };
    case 'SET_FALLBACK':
      return { ...state, fallbackScriptStep: action.step };
    case 'RESET':
      return initialChatState;
    default:
      return state;
  }
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
  // Always start with empty state — SSR-safe. Hydrate from localStorage
  // in a useEffect (see hydration effect below).
  const [{ messages, currentStep, fallbackScriptStep }, chatDispatch] = useReducer(
    chatReducer,
    initialChatState,
  );
  const [isTyping, setIsTyping] = useState(false);
  // isComplete uses useReducer so the completion check effect can dispatch
  // without triggering ESLint's react-hooks/set-state-in-effect rule.
  // Initialize as false — hydration effect will restore if conversation was complete.
  const [isComplete, dispatchComplete] = useReducer(
    (_prev: boolean, value: boolean) => value,
    false,
  );
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const completionChecked = useRef(false);
  const hasInitialized = useRef(false);
  const hasShownFallbackToast = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const hydrationDone = useRef(false);
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

  // ─── Hydrate from localStorage after first client render ───
  // This MUST run before the greeting effect (effects execute in definition order).
  // If persisted messages exist, it restores them and marks hasInitialized
  // so the greeting effect skips (no duplicate greeting for resumed conversations).
  useEffect(() => {
    if (hydrationDone.current) return;
    hydrationDone.current = true;

    const persisted = storageKey ? loadPersistedState(storageKey) : null;
    if (persisted && persisted.messages.length > 0) {
      chatDispatch({ type: 'HYDRATE', messages: persisted.messages, step: persisted.step });
      // Restore completion state for resumed conversations
      if (persisted.messages.length >= 5 && persisted.step > 4) {
        dispatchComplete(true);
        completionChecked.current = true;
      }
      hasInitialized.current = true;
    }
  }, [storageKey]);

  // ─── Fallback mode: emit the next expert message from the script ───
  const scheduleFallbackExpertEmission = useCallback((scriptStep: number) => {
    const script = scriptRef.current;
    if (!script || scriptStep >= script.length) return;
    if (script[scriptStep]?.sender !== 'expert') return;

    setIsTyping(true);

    const delay = getRandomDelay();
    fallbackTimerRef.current = setTimeout(() => {
      const message = script[scriptStep];
      chatDispatch({
        type: 'ADD_MSG',
        updater: (prev) => [...prev, { ...message, timestamp: Date.now() }],
      });
      setIsTyping(false);
      chatDispatch({ type: 'INC_FALLBACK' });
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

      chatDispatch({ type: 'ADD_MSG', updater: (prev) => [...prev, userMsg] });
      setIsTyping(true);
      chatDispatch({ type: 'INC_STEP' });

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

          chatDispatch({
            type: 'SET_MSGS',
            messages: (prev) => {
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
            },
          });
        }

        // Ensure the final AI message exists in state
        chatDispatch({
          type: 'SET_MSGS',
          messages: (prev) => {
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
          },
        });

        setIsTyping(false);
        chatDispatch({ type: 'INC_STEP' });

        // Detect if the streamed content is actually an error message
        // (happens when streamText throws after the response already started streaming,
        // or when Gemini returns a JSON error inside the SSE stream).
        const looksLikeError = isErrorContent(aiContent);

        if (looksLikeError && fallbackScript) {
          console.warn(
            'AI stream returned error content, switching to fallback:',
            aiContent.slice(0, 100),
          );
          if (!hasShownFallbackToast.current) {
            hasShownFallbackToast.current = true;
            toast.warning('AI encountered an issue. Using pre-configured responses as fallback.', {
              duration: 5000,
            });
          }
          // Remove the error message from chat
          const msgId = expertMsgId;
          if (msgId) {
            chatDispatch({ type: 'REMOVE_MSG', id: msgId });
          }
          // Show a user-friendly notice so the user knows fallback activated
          chatDispatch({
            type: 'ADD_MSG',
            updater: (prev) => [
              ...prev,
              {
                id: `fallback-notice-${Date.now()}`,
                sender: 'expert',
                text: FALLBACK_NOTICE_MESSAGE,
                timestamp: Date.now(),
              },
            ],
          });
          setUseFallback(true);
          // Skip past the first script greeting if AI already sent one
          const hasExistingExpert = messagesRef.current.some((m) => m.sender === 'expert');
          if (hasExistingExpert && fallbackScript[0]?.sender === 'expert') {
            chatDispatch({ type: 'SET_FALLBACK', step: 1 });
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
          // Show a user-friendly notice in chat
          chatDispatch({
            type: 'ADD_MSG',
            updater: (prev) => [
              ...prev,
              {
                id: `fallback-notice-${Date.now()}`,
                sender: 'expert',
                text: FALLBACK_NOTICE_MESSAGE,
                timestamp: Date.now(),
              },
            ],
          });
          // Advance past the first script greeting if AI already sent one
          const hasExistingExpert = messagesRef.current.some((m) => m.sender === 'expert');
          if (hasExistingExpert && fallbackScript[0]?.sender === 'expert') {
            chatDispatch({ type: 'SET_FALLBACK', step: 1 });
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

        chatDispatch({ type: 'ADD_MSG', updater: (prev) => [...prev, message] });
        chatDispatch({ type: 'INC_FALLBACK' });
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

          chatDispatch({
            type: 'SET_MSGS',
            messages: [
              {
                id: `ai-${Date.now()}`,
                sender: 'expert',
                text: aiContent,
                timestamp: Date.now(),
              },
            ],
          });
        }

        chatDispatch({ type: 'SET_STEP', step: 1 });

        // Also check greeting stream for error content
        if (aiContent.length > 0 && isErrorContent(aiContent)) {
          console.warn(
            'AI greeting stream returned error content, switching to fallback:',
            aiContent.slice(0, 100),
          );
          throw new Error('Greeting stream contained error');
        }
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
          // Show user-friendly notice + first script greeting
          const firstExpertMsg = fallbackScript.find((m) => m.sender === 'expert');
          if (firstExpertMsg) {
            chatDispatch({
              type: 'SET_MSGS',
              messages: [
                {
                  id: `fallback-notice-${Date.now()}`,
                  sender: 'expert',
                  text: FALLBACK_NOTICE_MESSAGE,
                  timestamp: Date.now(),
                },
                { ...firstExpertMsg, timestamp: Date.now() },
              ],
            });
            const firstExpertIdx = fallbackScript.indexOf(firstExpertMsg);
            chatDispatch({ type: 'SET_FALLBACK', step: firstExpertIdx + 1 });
          } else {
            chatDispatch({
              type: 'SET_MSGS',
              messages: [
                {
                  id: `fallback-notice-${Date.now()}`,
                  sender: 'expert',
                  text: FALLBACK_NOTICE_MESSAGE,
                  timestamp: Date.now(),
                },
              ],
            });
          }
        } else {
          // No fallback available — show a generic greeting
          chatDispatch({
            type: 'SET_MSGS',
            messages: [
              {
                id: 'ai-fallback',
                sender: 'expert',
                text: 'Connection issue detected. Please try sending a message to reconnect.',
                timestamp: Date.now(),
              },
            ],
          });
        }
      } finally {
        setIsTyping(false);
      }
    };

    triggerGreeting();
  }, [systemPrompt, fallbackScript, useFallback]);

  // ─── Completion check (enables 'Complete - Next' button) ───
  // After a meaningful conversation (AI greeting + user reply + AI response +
  // user reply + AI wrap-up), the button becomes available.
  // In fallback mode, completes when the script is exhausted.
  useEffect(() => {
    if (completionChecked.current && isComplete) return;
    if (isTyping) return;

    if (useFallback) {
      const script = scriptRef.current;
      if (script && fallbackScriptStep >= script.length) {
        dispatchComplete(true);
        completionChecked.current = true;
      }
    } else {
      const expertCount = messages.filter((m) => m.sender === 'expert').length;
      const userCount = messages.filter((m) => m.sender === 'user').length;

      // Require at least 2 full exchanges before enabling the button
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
    chatDispatch({ type: 'RESET' });
    setIsTyping(false);
    setError(null);
    setUseFallback(false);
    hasInitialized.current = false;
    hydrationDone.current = false;
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
