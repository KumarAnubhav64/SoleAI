'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export type PermissionStatus = 'idle' | 'granted' | 'denied' | 'unavailable';

interface UseCameraPermissionReturn {
  status: PermissionStatus;
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
  retry: () => Promise<void>;
  stopStream: () => void;
}

/**
 * A hook that manages camera and microphone permission lifecycle.
 *
 * - requestPermission(): prompts the user for video + audio access
 * - retry(): re-requests permission after a denial
 * - stopStream(): stops all tracks and resets to idle
 * - Automatically stops tracks on unmount
 * - Handles: denial, no device found, device in use, generic errors
 */
export function useCameraPermission(): UseCameraPermissionReturn {
  const [status, setStatus] = useState<PermissionStatus>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStreamInternal = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  const requestPermission = useCallback(async () => {
    // Check if navigator.mediaDevices exists
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setStatus('unavailable');
      setError(
        'Camera and microphone are not available in this environment. Please use a supported browser.',
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Stop any previous stream before requesting a new one
      stopStreamInternal();

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus('granted');
    } catch (err) {
      const error = err as DOMException;
      switch (error.name) {
        case 'NotAllowedError':
          setStatus('denied');
          setError(
            'Camera and microphone access was denied. Please update your browser permissions to use this feature.',
          );
          break;
        case 'NotFoundError':
          setStatus('unavailable');
          setError('No camera or microphone detected. Please connect a device and try again.');
          break;
        case 'NotReadableError':
          setStatus('unavailable');
          setError(
            'Your camera or microphone is already in use by another application. Please close that application and try again.',
          );
          break;
        default:
          setStatus('denied');
          setError(
            `Permission request failed: ${error.message || 'Unknown error'}. Please try again.`,
          );
      }
    } finally {
      setIsLoading(false);
    }
  }, [stopStreamInternal]);

  const retry = useCallback(async () => {
    setStatus('idle');
    setError(null);
    await requestPermission();
  }, [requestPermission]);

  const stopStream = useCallback(() => {
    stopStreamInternal();
    setStatus('idle');
    setError(null);
  }, [stopStreamInternal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreamInternal();
    };
  }, [stopStreamInternal]);

  return {
    status,
    stream,
    error,
    isLoading,
    requestPermission,
    retry,
    stopStream,
  };
}
