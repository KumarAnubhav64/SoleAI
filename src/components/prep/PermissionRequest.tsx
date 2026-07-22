'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  WarningCircle,
  ArrowClockwise,
} from '@phosphor-icons/react';

interface PermissionRequestProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: (error: string) => void;
}

export function PermissionRequest({
  onPermissionGranted,
  onPermissionDenied,
}: PermissionRequestProps) {
  const { status, stream, error, isLoading, requestPermission, retry } =
    useCameraPermission();
  const [, setHasRequested] = useState(false);

  // Auto-request on mount
  useEffect(() => {
    requestPermission().then(() => setHasRequested(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent of status changes
  useEffect(() => {
    if (status === 'granted') {
      onPermissionGranted?.();
    }
  }, [status, onPermissionGranted]);

  useEffect(() => {
    if (status === 'denied' || status === 'unavailable') {
      onPermissionDenied?.(error || 'Permission unavailable');
    }
  }, [status, error, onPermissionDenied]);

  return (
    <AnimatePresence mode="wait">
      {status === 'idle' && isLoading && (
        <motion.div
          key="loading"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-xl border border-slate-700 bg-slate-900 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
            <p className="text-sm text-slate-400">
              Requesting camera and microphone access...
            </p>
          </div>
        </motion.div>
      )}

      {status === 'granted' && (
        <motion.div
          key="granted"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5"
        >
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-400" weight="fill" />
            <div>
              <p className="text-sm font-medium text-emerald-300">
                Camera and microphone access granted
              </p>
              <p className="mt-0.5 text-xs text-emerald-400/70">
                Your devices are ready for the support workspace
              </p>
            </div>
          </div>
          {/* Preview */}
          {stream && (
            <div className="mt-3 overflow-hidden rounded-lg border border-emerald-500/20">
              <video
                ref={(el) => {
                  if (el && stream) el.srcObject = stream;
                }}
                autoPlay
                muted
                playsInline
                className="h-24 w-full object-cover"
              />
            </div>
          )}
        </motion.div>
      )}

      {status === 'denied' && (
        <motion.div
          key="denied"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-xl border border-red-500/30 bg-red-500/5 p-5"
        >
          <div className="flex items-start gap-3">
            <XCircle size={20} className="mt-0.5 shrink-0 text-red-400" weight="fill" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-300">
                Camera & microphone access denied
              </p>
              <p className="mt-1 text-xs leading-relaxed text-red-400/70">
                {error || 'Permission was denied. Please update your browser settings to allow camera and microphone access, then try again.'}
              </p>
              <p className="mt-2 text-xs text-red-400/50">
                You can still proceed to the workspace, but video recording will not be available.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={retry}
                  disabled={isLoading}
                  size="sm"
                  variant="secondary"
                  className="gap-1.5 text-xs"
                >
                  <ArrowClockwise size={14} />
                  {isLoading ? 'Requesting...' : 'Try Again'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {status === 'unavailable' && (
        <motion.div
          key="unavailable"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5"
        >
          <div className="flex items-start gap-3">
            <WarningCircle size={20} className="mt-0.5 shrink-0 text-amber-400" weight="fill" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-300">
                Camera & microphone not available
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-400/70">
                {error || 'No camera or microphone detected. Please connect a compatible device.'}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={retry}
                  disabled={isLoading}
                  size="sm"
                  variant="secondary"
                  className="gap-1.5 text-xs"
                >
                  <ArrowClockwise size={14} />
                  {isLoading ? 'Checking...' : 'Check Again'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
