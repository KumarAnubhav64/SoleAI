'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type RecorderState = 'idle' | 'recording' | 'stopped' | 'error';

interface UseMediaRecorderReturn {
  recordingState: RecorderState;
  blob: Blob | null;
  durationMs: number;
  error: string | null;
  isSupported: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  reset: () => void;
}

/**
 * A hook that wraps the browser's MediaRecorder API.
 *
 * - startRecording(): begins capturing from the given stream
 * - stopRecording(): stops and produces a Blob
 * - reset(): clears the recorded blob and returns to idle
 * - durationMs: tracks elapsed recording time via setInterval
 * - isSupported: false when MediaRecorder is unavailable or stream is null
 * - Handles ondataavailable, onstop, and onerror events
 */
export function useMediaRecorder(stream: MediaStream | null): UseMediaRecorderReturn {
  const [recordingState, setRecordingState] = useState<RecorderState>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSupported =
    typeof MediaRecorder !== 'undefined' && MediaRecorder !== null && stream !== null;

  const clearDurationInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startDurationTracking = useCallback(() => {
    startTimeRef.current = Date.now();
    clearDurationInterval();
    intervalRef.current = setInterval(() => {
      setDurationMs(Date.now() - startTimeRef.current);
    }, 200);
  }, [clearDurationInterval]);

  const startRecording = useCallback(() => {
    if (!isSupported) return;
    if (recordingState === 'recording') return;

    chunksRef.current = [];
    setBlob(null);
    setError(null);

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';

      const recorder = new MediaRecorder(stream!, {
        mimeType,
      });

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(chunksRef.current, {
          type: mimeType,
        });
        setBlob(recordedBlob);
        setRecordingState('stopped');
        clearDurationInterval();
      };

      recorder.onerror = () => {
        setError('An error occurred during recording. Please try again.');
        setRecordingState('error');
        clearDurationInterval();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingState('recording');
      startDurationTracking();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to start recording: ${message}`);
      setRecordingState('error');
    }
  }, [isSupported, recordingState, stream, clearDurationInterval, startDurationTracking]);

  const stopRecording = useCallback(() => {
    if (recordingState !== 'recording') return;
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [recordingState]);

  const reset = useCallback(() => {
    clearDurationInterval();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setBlob(null);
    setDurationMs(0);
    setError(null);
    setRecordingState('idle');
  }, [clearDurationInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearDurationInterval();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [clearDurationInterval]);

  return {
    recordingState,
    blob,
    durationMs,
    error,
    isSupported,
    startRecording,
    stopRecording,
    reset,
  };
}
