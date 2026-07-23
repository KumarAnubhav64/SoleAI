'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from '@phosphor-icons/react';
import { EQUIPMENT_TYPES, SEVERITY_LEVELS } from '@/lib/constants';
import { ConfigCard } from './ConfigCard';
import { Button } from '@/components/ui/button';
import { saveJobConfig } from '@/app/actions';
import { clearState, saveState } from '@/lib/storage';
import { createDefaultPersistedState } from '@/lib/types';

export function ConfigGrid() {
  const router = useRouter();
  const [equipmentType, setEquipmentType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isComplete = equipmentType !== null && severity !== null;

  const handleSubmit = async () => {
    if (!isComplete || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Clear any previous mission's persisted chat data
      clearState();
      await saveJobConfig(equipmentType!, severity!);
      // Save job config to localStorage so subsequent pages can read it
      const state = createDefaultPersistedState();
      state.jobConfig = {
        equipmentType: equipmentType as 'hvac' | 'industrial-printer' | 'server-rack',
        severity: severity as 'routine-maintenance' | 'critical-fault',
      };
      saveState(state);
      router.push('/prep');
    } catch (error) {
      console.error('Failed to save config:', error);
      setIsSubmitting(false);
    }
  };

  const selectedEquipment = EQUIPMENT_TYPES.find((eq) => eq.value === equipmentType);
  const selectedSeverity = SEVERITY_LEVELS.find((sv) => sv.value === severity);
  const equipmentDescription = selectedEquipment
    ? getEquipmentDescription(selectedEquipment.value)
    : undefined;
  const severityDescription = selectedSeverity
    ? getSeverityDescription(selectedSeverity.value)
    : undefined;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      {/* Equipment Type */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Equipment Type
        </h2>
        <p className="mb-4 text-xs text-slate-500">Select the equipment you are working on</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {EQUIPMENT_TYPES.map((eq) => (
            <ConfigCard
              key={eq.value}
              value={eq.value}
              label={eq.label}
              icon={eq.icon}
              description={equipmentType === eq.value ? equipmentDescription : undefined}
              selected={equipmentType === eq.value}
              onSelect={(val) => setEquipmentType(val)}
            />
          ))}
        </div>
      </section>

      {/* Severity Level */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Severity Level
        </h2>
        <p className="mb-4 text-xs text-slate-500">Select the severity of the issue</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SEVERITY_LEVELS.map((sv) => (
            <ConfigCard
              key={sv.value}
              value={sv.value}
              label={sv.label}
              icon={sv.value === 'critical-fault' ? 'warning' : 'wrench'}
              description={severity === sv.value ? severityDescription : undefined}
              selected={severity === sv.value}
              onSelect={(val) => setSeverity(val)}
            />
          ))}
        </div>
      </section>

      {/* Submit */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          size="lg"
          className="min-w-[200px] gap-2 text-base"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Starting Mission...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Start Mission
              <ArrowRight size={18} weight="bold" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

function getEquipmentDescription(value: string): string {
  const descriptions: Record<string, string> = {
    hvac: 'Heating, ventilation, air conditioning',
    'industrial-printer': 'Large-format industrial printing',
    'server-rack': 'Data center server hardware',
  };
  return descriptions[value] || '';
}

function getSeverityDescription(value: string): string {
  const descriptions: Record<string, string> = {
    'routine-maintenance': 'Scheduled maintenance task',
    'critical-fault': 'Urgent system failure',
  };
  return descriptions[value] || '';
}
