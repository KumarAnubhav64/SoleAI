'use client';

import { RecordingControls } from '@/components/activity/RecordingControls';
import { TabActionButton } from '@/components/activity/TabActionButton';
import type { TabId } from '@/lib/types';

interface RepairTabProps {
  stream: MediaStream | null;
  onComplete: () => void;
  isSubmitting: boolean;
  isComplete: boolean;
}

export default function RepairTab({
  stream,
  onComplete,
  isSubmitting,
  isComplete,
}: RepairTabProps) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-100">
          Repair Documentation
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Record yourself performing the repair. Describe the steps you are
          taking for the documentation.
        </p>
      </div>

      <div className="flex-1">
        <RecordingControls stream={stream} />
      </div>

      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
        <p className="text-xs text-slate-600">
          Record a video documenting your repair process.
        </p>
        <TabActionButton
          tabId={'repair' as TabId}
          isLastTab={false}
          isComplete={isComplete}
          onComplete={onComplete}
          disabled={isComplete}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
}
