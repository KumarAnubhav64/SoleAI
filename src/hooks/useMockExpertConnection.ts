import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage } from '@/lib/types';
import {
  MOCK_EXPERT_DELAY_MIN,
  MOCK_EXPERT_DELAY_MAX,
} from '@/lib/constants';

interface UseMockExpertConnectionReturn {
  messages: ChatMessage[];
  currentMessage: ChatMessage | null;
  isTyping: boolean;
  isComplete: boolean;
  sendMessage: (text: string) => void;
  simulateSpeech: () => void;
  currentStep: number;
  reset: () => void;
}

function getRandomDelay(): number {
  return (
    Math.floor(
      Math.random() * (MOCK_EXPERT_DELAY_MAX - MOCK_EXPERT_DELAY_MIN + 1),
    ) + MOCK_EXPERT_DELAY_MIN
  );
}

/**
 * A hook that mimics a real-time chat connection with a "Remote Expert".
 *
 * Takes a script of ChatMessages and emits them one by one with
 * artificial delays (1.5-3s) to simulate network latency.
 *
 * - Expert messages auto-emit after a delay
 * - User messages wait for sendMessage() or simulateSpeech()
 * - On resume (initialStep > 0), past messages emit instantly
 *
 * State machine:
 *   useEffect (currentStep) → scheduleExpertEmission(step) → timer fires
 *   → emit message + setCurrentStep(step+1) → useEffect fires again
 *   The useEffect is the SOLE driver — no recursive scheduling from timers.
 *   processingRef guards against stale timer callbacks.
 */
export function useMockExpertConnection(
  script: ChatMessage[],
  initialStep = 0,
): UseMockExpertConnectionReturn {
  const [emittedMessages, setEmittedMessages] = useState<ChatMessage[]>(() =>
    script.slice(0, initialStep),
  );
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(initialStep >= script.length);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptRef = useRef(script);
  const mountedRef = useRef(true);
  // Guards against stale timer callbacks firing after a reset or re-schedule
  const processingRef = useRef<number | null>(null);

  scriptRef.current = script;

  // Reset mounted flag on every effect run (handles React StrictMode
  // double-invocation in dev: the cleanup sets mountedRef and
  // processingRef to their initial states so the second invocation
  // can schedule a fresh timer.)
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      processingRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  /**
   * Schedule a single expert message emission.
   * Only called from the useEffect below — never recursively from a timer.
   */
  const scheduleExpertEmission = useCallback((step: number) => {
    if (step >= scriptRef.current.length) return;
    if (scriptRef.current[step]?.sender !== 'expert') return;
    if (!mountedRef.current) return;
    // Already processing this exact step (prevents useEffect re-entrance)
    if (processingRef.current === step) return;

    processingRef.current = step;
    setIsTyping(true);

    const delay = getRandomDelay();
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      if (processingRef.current !== step) return; // Stale timer guard

      const message = scriptRef.current[step];
      setEmittedMessages((prev) => [
        ...prev,
        { ...message, timestamp: Date.now() },
      ]);
      setIsTyping(false);
      processingRef.current = null;

      // Advance step — the useEffect will schedule the next step
      setCurrentStep((prev) => prev + 1);

      // Check if this was the last message
      if (step + 1 >= scriptRef.current.length) {
        setIsComplete(true);
      }
    }, delay);
  }, []);

  // ── Single driver effect: process whatever message is at currentStep ──
  useEffect(() => {
    if (isComplete) return;
    if (currentStep >= scriptRef.current.length) {
      setIsComplete(true);
      return;
    }

    const sender = scriptRef.current[currentStep]?.sender;

    if (sender === 'expert') {
      scheduleExpertEmission(currentStep);
    }
    // If sender is 'user', wait for sendMessage / simulateSpeech
  }, [currentStep, isComplete, scheduleExpertEmission]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (currentStep >= scriptRef.current.length) return;

      const sender = scriptRef.current[currentStep]?.sender;
      if (sender !== 'user') return;

      // Cancel any pending timer for this step
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      processingRef.current = null;

      const message: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: text.trim(),
        timestamp: Date.now(),
      };

      setEmittedMessages((prev) => [...prev, message]);
      // Advance step — useEffect picks up the next message
      setCurrentStep((prev) => prev + 1);
    },
    [currentStep],
  );

  const simulateSpeech = useCallback(() => {
    if (currentStep >= scriptRef.current.length) return;
    const sender = scriptRef.current[currentStep]?.sender;
    if (sender !== 'user') return;

    // Auto-pull the next user message from the script
    const scriptMessage = scriptRef.current[currentStep];
    sendMessage(scriptMessage.text);
  }, [currentStep, sendMessage]);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    processingRef.current = null;
    setEmittedMessages([]);
    setCurrentStep(0);
    setIsTyping(false);
    setIsComplete(false);
  }, []);

  return {
    messages: emittedMessages,
    currentMessage:
      emittedMessages.length > 0
        ? emittedMessages[emittedMessages.length - 1]
        : null,
    isTyping,
    isComplete,
    sendMessage,
    simulateSpeech,
    currentStep,
    reset,
  };
}
