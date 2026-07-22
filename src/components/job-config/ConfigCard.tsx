'use client';

import { motion } from 'motion/react';
import { Snowflake, Printer, ComputerTower, Warning, Wrench } from '@phosphor-icons/react';

interface ConfigCardProps {
  value: string;
  label: string;
  icon: string;
  description?: string;
  selected: boolean;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  snowflake: Snowflake,
  printer: Printer,
  server: ComputerTower,
  warning: Warning,
  wrench: Wrench,
};

export function ConfigCard({
  value,
  label,
  icon,
  description,
  selected,
  onSelect,
  disabled = false,
}: ConfigCardProps) {
  const Icon = iconMap[icon] || Wrench;

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(value)}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      className={`
        relative flex flex-col items-center gap-3 rounded-xl border p-5 text-left
        transition-colors duration-200
        ${
          selected
            ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50'
            : 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/80'
        }
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      `}
      aria-pressed={selected}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
          selected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'
        }`}
      >
        <Icon size={22} weight={selected ? 'fill' : 'regular'} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 6L5 9L10 3"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}
