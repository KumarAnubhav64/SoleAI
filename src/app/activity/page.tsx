'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TabContainer } from '@/components/activity/TabContainer';
import { useCameraPermission } from '@/hooks/useCameraPermission';

export default function ActivityPage() {
  const router = useRouter();
  const { stream, requestPermission } = useCameraPermission();

  // Request camera on mount
  useEffect(() => {
    requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAllComplete = useCallback(() => {
    router.push('/performance');
  }, [router]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Split-screen workspace */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left Panel — Tab Content */}
        <div className="flex w-full flex-1 flex-col border-b border-slate-800 lg:border-b-0">
          <TabContainer stream={stream} onAllComplete={handleAllComplete} />
        </div>

        {/* Divider line between panels */}
        <div className="hidden w-px shrink-0 bg-gradient-to-b from-slate-700 via-slate-600 to-slate-700 lg:block" />

        {/* Right Panel — Persistent Remote Expert */}
        <div className="flex w-full flex-1 flex-col border-t border-slate-800 bg-slate-950/50 lg:border-t-0">
          <div className="border-b border-slate-800 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
              </span>
              <p className="text-xs font-medium text-slate-300">Remote Expert — Connected</p>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="text-center">
              <p className="text-xs text-slate-600">Expert panel is context-aware.</p>
              <p className="mt-1 text-xs text-slate-600">
                The active tab&apos;s chat appears in the left panel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
