'use client';

import { motion } from 'motion/react';
import {
  Lock,
  CheckCircle,
  PlayCircle,
  ChatDots,
  VideoCamera,
  Question,
} from '@phosphor-icons/react';
import type { TabId, TabStatus } from '@/lib/types';

interface TabHeaderProps {
  tabId: TabId;
  status: TabStatus;
  onClick: () => void;
}

const tabMeta: Record<TabId, { label: string; Icon: React.ElementType }> = {
  scoping: { label: 'Scoping', Icon: ChatDots },
  repair: { label: 'Repair', Icon: VideoCamera },
  qa: { label: 'QA', Icon: Question },
};

export function TabHeader({ tabId, status, onClick }: TabHeaderProps) {
  const { label, Icon } = tabMeta[tabId];

  const statusIcon = {
    locked: Lock,
    active: PlayCircle,
    completed: CheckCircle,
  }[status];

  const StatusIcon = statusIcon;

  return (
    <motion.button
      onClick={onClick}
      whileHover={status !== 'locked' ? { scale: 1.02 } : undefined}
      whileTap={status !== 'locked' ? { scale: 0.98 } : undefined}
      className={`
        relative flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium
        transition-colors duration-200
        ${
          status === 'locked'
            ? 'border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed'
            : status === 'active'
              ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
              : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
        }
      `}
      aria-label={`${label} tab — ${status}`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          status === 'locked'
            ? 'text-slate-600'
            : status === 'active'
              ? 'text-blue-400'
              : 'text-emerald-400'
        }`}
      >
        <StatusIcon size={14} weight={status === 'completed' ? 'fill' : 'regular'} />
      </span>
      <span>{label}</span>
      {status === 'active' && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -right-1 -top-1 flex h-2 w-2"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </motion.span>
      )}
    </motion.button>
  );
}
