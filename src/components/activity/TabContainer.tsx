'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TabHeader } from './TabHeader';
import { GlobalTimer } from './GlobalTimer';
import { Skeleton } from '@/components/ui/skeleton';
import { useTabState } from '@/hooks/useTabState';
import { TAB_ORDER } from '@/lib/constants';
import type { TabId } from '@/lib/types';

// Lazy-loaded tabs
const ScopingTab = dynamic(() => import('@/components/activity/tabs/ScopingTab'), {
  loading: () => (
    <div className="space-y-3 p-4">
      <Skeleton className="h-20 w-3/4 rounded-xl" />
      <Skeleton className="h-16 w-1/2 rounded-xl" />
      <Skeleton className="h-24 w-2/3 rounded-xl" />
    </div>
  ),
});

const RepairTab = dynamic(() => import('@/components/activity/tabs/RepairTab'), {
  ssr: false,
  loading: () => (
    <div className="space-y-3 p-4">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-10 w-24 rounded-lg" />
    </div>
  ),
});

const QATab = dynamic(() => import('@/components/activity/tabs/QATab'), {
  loading: () => (
    <div className="space-y-3 p-4">
      <Skeleton className="h-20 w-3/4 rounded-xl" />
      <Skeleton className="h-16 w-1/2 rounded-xl" />
      <Skeleton className="h-24 w-2/3 rounded-xl" />
    </div>
  ),
});

interface TabContainerProps {
  stream: MediaStream | null;
  onAllComplete?: () => void;
}

export function TabContainer({ stream, onAllComplete }: TabContainerProps) {
  const { tabStatuses, activeTab, isComplete, completeTab, goToTab } = useTabState();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isComplete) {
      onAllComplete?.();
    }
  }, [isComplete, onAllComplete]);

  const handleGlobalExpire = useCallback(() => {
    // Save current progress and redirect
    window.location.href = '/performance';
  }, []);

  const handleCompleteTab = useCallback(
    async (tabId: TabId) => {
      setIsSubmitting(true);
      try {
        // Mark tab complete via API
        await fetch('/api/complete-tab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tabId }),
        });
        completeTab(tabId);
      } catch (error) {
        console.error('Failed to save tab completion:', error);
        // Still complete the tab on the client side
        completeTab(tabId);
      } finally {
        setIsSubmitting(false);
      }
    },
    [completeTab],
  );

  const currentTab = activeTab || 'scoping';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tab Headers */}
      <div className="flex gap-1.5 border-b border-slate-800 px-3 py-2">
        {TAB_ORDER.map((tabId) => (
          <TabHeader
            key={tabId}
            tabId={tabId}
            status={tabStatuses[tabId]}
            onClick={() => goToTab(tabId)}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {currentTab === 'scoping' && (
              <ScopingTab
                onComplete={() => handleCompleteTab('scoping')}
                isSubmitting={isSubmitting}
                isComplete={tabStatuses.scoping === 'completed'}
              />
            )}
            {currentTab === 'repair' && (
              <RepairTab
                stream={stream}
                onComplete={() => handleCompleteTab('repair')}
                isSubmitting={isSubmitting}
                isComplete={tabStatuses.repair === 'completed'}
              />
            )}
            {currentTab === 'qa' && (
              <QATab
                onComplete={() => handleCompleteTab('qa')}
                isSubmitting={isSubmitting}
                isComplete={tabStatuses.qa === 'completed'}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Global Timer */}
      <GlobalTimer onExpire={handleGlobalExpire} />
    </div>
  );
}
