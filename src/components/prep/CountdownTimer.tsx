'use client';

import { motion } from 'motion/react';
import { useCountdown } from '@/hooks/useCountdown';
import { Clock } from '@phosphor-icons/react';

interface CountdownTimerProps {
  totalSeconds: number;
  onExpire?: () => void;
  autoStart?: boolean;
}

export function CountdownTimer({ totalSeconds, onExpire, autoStart = true }: CountdownTimerProps) {
  const { secondsRemaining, isExpired } = useCountdown(totalSeconds, onExpire, !autoStart);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isLow = secondsRemaining <= 10;
  const isCritical = secondsRemaining <= 5;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Clock size={14} />
        <span>Time remaining</span>
      </div>

      <motion.div
        key={secondsRemaining}
        initial={isLow ? { scale: 1.05 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`font-mono text-5xl font-bold tracking-tight sm:text-6xl ${
          isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-slate-100'
        }`}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </motion.div>

      {isExpired && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-400"
        >
          Time&apos;s up! Redirecting...
        </motion.p>
      )}
    </div>
  );
}
