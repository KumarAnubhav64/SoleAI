'use client';

import { motion } from 'motion/react';
import { Clock, ClockCountdown } from '@phosphor-icons/react';
import { useCountdown } from '@/hooks/useCountdown';
import { GLOBAL_TIMER_SECONDS } from '@/lib/constants';

interface GlobalTimerProps {
  onExpire?: () => void;
}

export function GlobalTimer({ onExpire }: GlobalTimerProps) {
  const { secondsRemaining, isExpired } = useCountdown(
    GLOBAL_TIMER_SECONDS,
    onExpire,
  );

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isLow = secondsRemaining <= 60;
  const isCritical = secondsRemaining <= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border px-3.5 py-2 shadow-lg backdrop-blur-sm
        ${
          isCritical
            ? 'border-red-500/50 bg-red-500/20 text-red-300'
            : isLow
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              : 'border-slate-700 bg-slate-900/90 text-slate-300'
        }
      `}
    >
      {isCritical ? (
        <ClockCountdown
          size={14}
          weight="fill"
          className="animate-pulse text-red-400"
        />
      ) : (
        <Clock size={14} />
      )}
      <span
        className={`font-mono text-sm font-bold tabular-nums ${
          isLow ? 'animate-pulse' : ''
        }`}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </motion.div>
  );
}
