'use client';

import { Shield, Warning } from '@phosphor-icons/react';
import safetyData from '@/data/safety-instructions.json';
import type { EquipmentType, SeverityLevel } from '@/lib/types';

interface SafetyInstructionsProps {
  equipmentType: EquipmentType;
  severity: SeverityLevel;
}

export function SafetyInstructions({
  equipmentType,
  severity,
}: SafetyInstructionsProps) {
  const instructions = (
    safetyData as Record<string, Record<string, string[]>>
  )[equipmentType]?.[severity];

  if (!instructions || instructions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <p className="text-sm text-slate-500">
          No safety instructions available for this configuration.
        </p>
      </div>
    );
  }

  const isCritical = severity === 'critical-fault';
  const Icon = isCritical ? Warning : Shield;

  return (
    <div
      className={`rounded-xl border p-5 ${
        isCritical
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-slate-700 bg-slate-900'
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            isCritical
              ? 'bg-red-500/20 text-red-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          <Icon size={20} weight="fill" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Safety Instructions
          </h3>
          <p className="text-xs text-slate-500">
            {isCritical
              ? 'Review critical safety warnings before proceeding'
              : 'Standard safety guidelines'}
          </p>
        </div>
      </div>

      {/* Instruction list */}
      <ul className="space-y-2.5">
        {instructions.map((instruction, index) => {
          const isUrgent =
            isCritical &&
            (instruction.startsWith('IMMEDIATELY') ||
              instruction.startsWith('Do NOT') ||
              instruction.startsWith('If the fault') ||
              instruction.startsWith('Have a fire'));
          return (
            <li key={index} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  isUrgent
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`text-xs leading-relaxed ${
                  isUrgent
                    ? 'font-medium text-red-300'
                    : 'text-slate-400'
                }`}
              >
                {instruction}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
