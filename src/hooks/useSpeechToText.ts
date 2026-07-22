'use client';

import { useRef, useCallback, useEffect, useReducer } from 'react';

// Type declarations for the Web Speech API SpeechRecognition
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export type SttStatus = 'probing' | 'ready' | 'unavailable';

interface UseSpeechToTextReturn {
  /** Current STT status: probing → ready or unavailable */
  status: SttStatus;
  /** Whether the browser is currently listening for speech */
  isListening: boolean;
  /** The most recently recognized transcript */
  transcript: string;
  /** Start listening for speech */
  startListening: () => void;
  /** Stop listening and return any final transcript */
  stopListening: () => void;
  /** Reset transcript */
  reset: () => void;
}

type Action =
  | { type: 'SET_STATUS'; status: SttStatus }
  | { type: 'SET_LISTENING'; listening: boolean }
  | { type: 'SET_TRANSCRIPT'; transcript: string }
  | { type: 'RESET_TRANSCRIPT' };

interface State {
  status: SttStatus;
  isListening: boolean;
  transcript: string;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_LISTENING':
      return { ...state, isListening: action.listening };
    case 'SET_TRANSCRIPT':
      return { ...state, transcript: action.transcript };
    case 'RESET_TRANSCRIPT':
      return { ...state, transcript: '' };
    default:
      return state;
  }
}

/**
 * A hook that wraps the browser's Web Speech API SpeechRecognition.
 *
 * On mount, performs a silent 3-second probe to determine if the
 * API actually works (Chrome yes, Brave no) without showing errors.
 *
 * States: probing (initial check) → ready or unavailable
 */
export function useSpeechToText(): UseSpeechToTextReturn {
  const [state, dispatch] = useReducer(reducer, {
    status: 'probing',
    isListening: false,
    transcript: '',
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mountedRef = useRef(true);

  const SpeechRecognitionCtor: SpeechRecognitionConstructor | undefined =
    typeof window !== 'undefined'
      ? ((window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
          .webkitSpeechRecognition ??
        (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
          .SpeechRecognition)
      : undefined;

  const hasCtor = SpeechRecognitionCtor !== undefined;

  // ── Silent probe on mount ───────────────────────────────────────
  useEffect(() => {
    if (!hasCtor || !SpeechRecognitionCtor) {
      dispatch({ type: 'SET_STATUS', status: 'unavailable' });
      return;
    }

    let settled = false;

    const settle = (result: SttStatus) => {
      if (settled || !mountedRef.current) return;
      settled = true;
      dispatch({ type: 'SET_STATUS', status: result });
    };

    try {
      const probe = new SpeechRecognitionCtor();
      probe.continuous = false;
      probe.interimResults = false;
      probe.lang = 'en-US';
      probe.maxAlternatives = 1;

      probe.onerror = () => settle('unavailable');
      probe.onstart = () => {
        settle('ready');
        try {
          probe.abort();
        } catch {
          // Ignore abort errors
        }
      };

      probe.onend = () => {
        if (!settled && mountedRef.current) {
          settle('ready');
        }
      };

      const timeoutId = setTimeout(() => settle('unavailable'), 3000);

      probe.start();

      return () => {
        clearTimeout(timeoutId);
        try {
          probe.abort();
        } catch {
          // Ignore
        }
      };
    } catch {
      settle('unavailable');
    }
  }, [hasCtor, SpeechRecognitionCtor]);

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (state.status !== 'ready' || !SpeechRecognitionCtor) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }

    dispatch({ type: 'RESET_TRANSCRIPT' });

    try {
      const recognition = new SpeechRecognitionCtor();

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (mountedRef.current) dispatch({ type: 'SET_LISTENING', listening: true });
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            if (mountedRef.current) {
              dispatch({ type: 'SET_TRANSCRIPT', transcript: result[0].transcript });
            }
            return;
          }
          interimTranscript += result[0].transcript;
        }

        if (mountedRef.current) {
          dispatch({ type: 'SET_TRANSCRIPT', transcript: interimTranscript });
        }
      };

      recognition.onerror = () => {
        if (mountedRef.current) dispatch({ type: 'SET_LISTENING', listening: false });
      };

      recognition.onend = () => {
        if (mountedRef.current) dispatch({ type: 'SET_LISTENING', listening: false });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      if (mountedRef.current) dispatch({ type: 'SET_LISTENING', listening: false });
    }
  }, [state.status, SpeechRecognitionCtor]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    dispatch({ type: 'SET_LISTENING', listening: false });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET_TRANSCRIPT' });
  }, []);

  return {
    status: state.status,
    isListening: state.isListening,
    transcript: state.transcript,
    startListening,
    stopListening,
    reset,
  };
}
