'use client';

import { CheckCircle, ArrowClockwise } from '@phosphor-icons/react';
import Link from 'next/link';

export default function PerformancePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
          <CheckCircle size={32} className="text-emerald-400" weight="fill" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
          Mission Complete
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Thank you for your thorough work. The job has been logged and the
          repair documentation has been submitted.
        </p>

        {/* Summary Card */}
        <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6 text-left">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Job Summary
          </h2>
          <div className="space-y-2.5">
            <SummaryRow label="Status" value="Completed" valueColor="text-emerald-400" />
            <SummaryRow label="Tabs Completed" value="3 / 3" />
            <SummaryRow label="Recording" value="Submitted" />
            <SummaryRow label="QA Check" value="Passed" valueColor="text-emerald-400" />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
          >
            <ArrowClockwise size={16} />
            New Mission
          </Link>
        </div>
      </div>
    </main>
  );
}

function SummaryRow({
  label,
  value,
  valueColor = 'text-slate-200',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}
