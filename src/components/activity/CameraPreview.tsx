'use client';

import { useRef, useEffect } from 'react';
import { VideoCamera } from '@phosphor-icons/react';

interface CameraPreviewProps {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
}

export function CameraPreview({ stream, muted = true, className = '' }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/50 ${className}`}
      >
        <div className="flex flex-col items-center gap-2 text-slate-600">
          <VideoCamera size={24} />
          <p className="text-xs">Camera feed unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg bg-black ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
