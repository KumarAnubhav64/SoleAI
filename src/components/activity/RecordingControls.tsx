'use client';

import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { Button } from '@/components/ui/button';
import { Play, Square, Spinner } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { CameraPreview } from './CameraPreview';
import { RecordingPreview } from './RecordingPreview';

interface RecordingControlsProps {
  stream: MediaStream | null;
}

export function RecordingControls({ stream }: RecordingControlsProps) {
  const {
    recordingState,
    blob,
    durationMs,
    error,
    isSupported,
    startRecording,
    stopRecording,
    reset,
  } = useMediaRecorder(stream);

  const durationSeconds = Math.floor(durationMs / 1000);
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationRemainder = durationSeconds % 60;

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center">
        <p className="text-xs text-amber-400">
          Recording is not supported in this environment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Camera Preview or Recording Preview */}
      <AnimatePresence mode="wait">
        {recordingState === 'stopped' && blob ? (
          <RecordingPreview key="preview" blob={blob} />
        ) : (
          <CameraPreview
            key="preview-live"
            stream={stream}
            className="aspect-video"
          />
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
        <div className="flex items-center gap-3">
          {recordingState === 'recording' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <span className="flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="font-mono text-sm text-red-400 tabular-nums">
                {String(durationMinutes).padStart(2, '0')}:
                {String(durationRemainder).padStart(2, '0')}
              </span>
            </motion.div>
          )}

          {recordingState === 'stopped' && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-emerald-400"
            >
              Recording saved ({durationSeconds}s)
            </motion.span>
          )}

          {recordingState === 'error' && (
            <span className="text-xs text-red-400">{error}</span>
          )}
        </div>

        <div className="flex gap-2">
          {recordingState === 'idle' && (
            <Button
              onClick={startRecording}
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Play size={14} weight="fill" />
              Record
            </Button>
          )}

          {recordingState === 'recording' && (
            <Button
              onClick={stopRecording}
              size="sm"
              variant="destructive"
              className="gap-1.5 text-xs"
            >
              <Square size={14} weight="fill" />
              Stop
            </Button>
          )}

          {recordingState === 'stopped' && (
            <Button
              onClick={reset}
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
            >
              <Spinner size={14} />
              Re-record
            </Button>
          )}

          {recordingState === 'error' && (
            <Button
              onClick={reset}
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
            >
              <Spinner size={14} />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
