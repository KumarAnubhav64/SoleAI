'use client';

import { useRef, useEffect } from 'react';

interface RecordingPreviewProps {
  blob: Blob | null;
}

export function RecordingPreview({ blob }: RecordingPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (blob) {
      urlRef.current = URL.createObjectURL(blob);
      if (videoRef.current) {
        videoRef.current.src = urlRef.current;
      }
    }

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, [blob]);

  if (!blob) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/50">
        <p className="text-xs text-slate-600">No recording yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} controls playsInline className="w-full" />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Duration: {blob.size ? formatDuration(blob.size) : '0s'}</span>
        <span className="text-slate-600">{formatSize(blob.size)}</span>
      </div>
    </div>
  );
}

function formatDuration(bytes: number): string {
  // Rough estimate: ~2MB per minute for video
  const minutes = Math.floor(bytes / 2_000_000);
  const seconds = Math.floor((bytes % 2_000_000) / 33_333);
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${Math.max(1, seconds)}s`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
