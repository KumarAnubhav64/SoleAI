'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTextToSpeechOptions {
  /** Speech rate (0.1 to 10, default 1.0) */
  rate?: number;
  /** Speech pitch (0 to 2, default 1.0) */
  pitch?: number;
  /** Start muted (default false) */
  muted?: boolean;
}

interface UseTextToSpeechReturn {
  /** Speak the given text aloud */
  speak: (text: string) => void;
  /** Stop any current speech */
  stop: () => void;
  /** Whether speech is currently playing */
  isSpeaking: boolean;
  /** Whether speechSynthesis is available in this browser */
  isSupported: boolean;
  /** Whether TTS is muted */
  isMuted: boolean;
  /** Toggle mute state */
  toggleMute: () => void;
  /** Set mute state */
  setMuted: (muted: boolean) => void;
}

/**
 * A hook that wraps the browser's `window.speechSynthesis` API.
 *
 * Automatically cancels speech on unmount.
 * Handles the Chrome speechSynthesis timing bug where voices
 * need to be loaded asynchronously before speaking.
 *
 * @param options - Rate, pitch, and initial mute state
 */
export function useTextToSpeech(options: UseTextToSpeechOptions = {}): UseTextToSpeechReturn {
  const { rate = 1.0, pitch = 1.0, muted: initialMuted = false } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mountedRef = useRef(true);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    window.speechSynthesis !== null &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current !== null) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  // Stop any current speech
  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    clearKeepAlive();
    setIsSpeaking(false);
  }, [isSupported, clearKeepAlive]);

  // Speak text
  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim() || isMuted) return;

      // Cancel any ongoing speech first + clear keep-alive
      window.speechSynthesis.cancel();
      clearKeepAlive();

      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        if (mountedRef.current) setIsSpeaking(true);
      };

      utterance.onend = () => {
        if (mountedRef.current) {
          setIsSpeaking(false);
          clearKeepAlive();
        }
      };

      utterance.onerror = (e) => {
        // Chrome fires 'interrupted'/'canceled' from cancel() — ignore those
        // 'synthesis-failed' is a known Chrome Linux bug with no workaround
        if (e.error !== 'interrupted' && e.error !== 'canceled' && e.error !== 'synthesis-failed') {
          console.warn('Speech synthesis error:', e.error);
        }
        if (mountedRef.current) {
          setIsSpeaking(false);
          clearKeepAlive();
        }
      };

      utteranceRef.current = utterance;

      // Chrome bug: speechSynthesis sometimes stops speaking after ~15 seconds.
      // Workaround: periodically check if speech is still active and
      // re-trigger if Chrome paused it.
      window.speechSynthesis.speak(utterance);

      // Periodic keep-alive check — Chrome may pause speech after ~15s
      keepAliveRef.current = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearKeepAlive();
        }
      }, 10000);
    },
    [isSupported, isMuted, rate, pitch, clearKeepAlive],
  );

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (!prev) {
        // Muting — stop current speech
        if (isSupported) {
          window.speechSynthesis.cancel();
          clearKeepAlive();
        }
        setIsSpeaking(false);
      }
      return !prev;
    });
  }, [isSupported, clearKeepAlive]);

  const setMuted = useCallback(
    (muted: boolean) => {
      setIsMuted(muted);
      if (muted && isSupported) {
        window.speechSynthesis.cancel();
        clearKeepAlive();
        setIsSpeaking(false);
      }
    },
    [isSupported, clearKeepAlive],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearKeepAlive();
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported, clearKeepAlive]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    isMuted,
    toggleMute,
    setMuted,
  };
}
