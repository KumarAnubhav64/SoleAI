'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// Type declarations for the Web Speech API SpeechRecognition
// These aren't included in standard DOM type libs for all browsers
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

interface UseSpeechToTextReturn {
  /** Whether the browser is currently listening */
  isListening: boolean;
  /** Whether SpeechRecognition is available in this browser */
  isSupported: boolean;
  /** The most recently recognized transcript */
  transcript: string;
  /** Error message if recognition failed */
  error: string | null;
  /** Start listening for speech */
  startListening: () => void;
  /** Stop listening and return any final transcript */
  stopListening: () => void;
  /** Reset transcript and error */
  reset: () => void;
}

/**
 * A hook that wraps the browser's Web Speech API SpeechRecognition
 * for real-time speech-to-text transcription.
 *
 * Uses `webkitSpeechRecognition` for Chrome/Edge compatibility.
 * Requires a secure context (HTTPS) or localhost.
 *
 * Returns partial (interim) results while the user is speaking,
 * and a final transcript when speech ends or is stopped manually.
 */
export function useSpeechToText(): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mountedRef = useRef(true);

  // Check browser support for webkitSpeechRecognition
  const SpeechRecognitionCtor: SpeechRecognitionConstructor | undefined =
    typeof window !== 'undefined'
      ? ((window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
          .webkitSpeechRecognition ??
        (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
          .SpeechRecognition)
      : undefined;

  const isSupported = SpeechRecognitionCtor !== undefined;

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors on unmount
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || !SpeechRecognitionCtor) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    // Abort any existing recognition session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }

    setError(null);
    setTranscript('');

    try {
      const recognition = new SpeechRecognitionCtor();

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (mountedRef.current) setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            // Final transcript — use it directly
            if (mountedRef.current) {
              setTranscript(result[0].transcript);
            }
            return;
          }
          // Interim results — show as the user speaks
          interimTranscript += result[0].transcript;
        }

        if (mountedRef.current) {
          setTranscript(interimTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (!mountedRef.current) return;

        switch (event.error) {
          case 'no-speech':
            setError('No speech detected. Please try again.');
            break;
          case 'audio-capture':
            setError('No microphone found. Please check your microphone.');
            break;
          case 'not-allowed':
            setError('Microphone access was denied. Please allow microphone permissions.');
            break;
          case 'network':
            setError('Network error occurred during speech recognition.');
            break;
          default:
            setError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        if (mountedRef.current) setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to start speech recognition: ${message}`);
        setIsListening(false);
      }
    }
  }, [isSupported, SpeechRecognitionCtor]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    reset,
  };
}
