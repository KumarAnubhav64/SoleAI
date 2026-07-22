'use client';

import { motion } from 'motion/react';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface TabActionButtonProps {
  isLastTab: boolean;
  isComplete?: boolean;
  onComplete: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function TabActionButton({
  isLastTab,
  isComplete = false,
  onComplete,
  disabled = false,
  isLoading = false,
}: TabActionButtonProps) {
  if (isComplete) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-400">
        <CheckCircle size={16} weight="fill" />
        <span>Completed</span>
      </div>
    );
  }

  const label = isLastTab ? 'Finish Job' : 'Complete & Continue';

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
      <Button
        onClick={onComplete}
        disabled={disabled || isLoading}
        size="sm"
        className="gap-1.5 text-xs"
      >
        {isLoading ? (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Processing...
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            {label}
            {isLastTab ? (
              <CheckCircle size={14} weight="bold" />
            ) : (
              <ArrowRight size={14} weight="bold" />
            )}
          </span>
        )}
      </Button>
    </motion.div>
  );
}
