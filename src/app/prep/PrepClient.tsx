'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';
import { CountdownTimer } from '@/components/prep/CountdownTimer';
import { SafetyInstructions } from '@/components/prep/SafetyInstructions';
import { PermissionRequest } from '@/components/prep/PermissionRequest';
import { Button } from '@/components/ui/button';
import { PREP_COUNTDOWN_SECONDS } from '@/lib/constants';
import type { EquipmentType, SeverityLevel } from '@/lib/types';

interface PrepClientProps {
  jobConfig: { equipmentType: string; severity: string };
}

export function PrepClient({ jobConfig }: PrepClientProps) {
  const router = useRouter();
  const [, setPermissionStatus] = useState<
    'pending' | 'granted' | 'denied' | 'unavailable'
  >('pending');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const equipmentType = jobConfig.equipmentType as EquipmentType;
  const severity = jobConfig.severity as SeverityLevel;

  const handleExpire = useCallback(async () => {
    if (isRedirecting) return;
    setIsRedirecting(true);

    try {
      await fetch('/api/prep-complete', { method: 'POST' });
      router.push('/activity');
    } catch {
      router.push('/activity');
    }
  }, [router, isRedirecting]);

  const handleSkip = useCallback(async () => {
    if (isRedirecting) return;
    setIsRedirecting(true);

    try {
      await fetch('/api/prep-complete', { method: 'POST' });
      router.push('/activity');
    } catch {
      router.push('/activity');
    }
  }, [router, isRedirecting]);

  return (
    <main className="flex-1 flex flex-col px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-4xl flex-1 gap-6 lg:grid-cols-5">
        {/* Left Column — Timer + Permissions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Countdown */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-900 p-8">
            <CountdownTimer
              totalSeconds={PREP_COUNTDOWN_SECONDS}
              onExpire={handleExpire}
            />
            <AnimatePresence>
              {!isRedirecting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-6"
                >
                  <Button
                    onClick={handleSkip}
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                  >
                    Skip &amp; Proceed
                    <ArrowRight size={14} />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            {isRedirecting && (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500/30 border-t-slate-500" />
                Redirecting to workspace...
              </div>
            )}
          </div>

          {/* Permissions */}
          <PermissionRequest
            onPermissionGranted={() => setPermissionStatus('granted')}
            onPermissionDenied={() => setPermissionStatus('denied')}
          />
        </div>

        {/* Right Column — Safety Instructions */}
        <div className="lg:col-span-3">
          {/* Job Config Summary */}
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Active Job
                </p>
                <p className="mt-1 text-sm font-medium text-slate-100">
                  {getEquipmentLabel(equipmentType)}
                </p>
              </div>
              <div
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  severity === 'critical-fault'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {severity === 'critical-fault'
                  ? 'Critical Fault'
                  : 'Routine Maintenance'}
              </div>
            </div>
          </div>

          {/* Safety */}
          <SafetyInstructions
            equipmentType={equipmentType}
            severity={severity}
          />
        </div>
      </div>
    </main>
  );
}

function getEquipmentLabel(type: EquipmentType): string {
  const labels: Record<EquipmentType, string> = {
    hvac: 'HVAC System',
    'industrial-printer': 'Industrial Printer',
    'server-rack': 'Server Rack',
  };
  return labels[type];
}
