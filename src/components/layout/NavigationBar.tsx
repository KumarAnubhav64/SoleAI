'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const PHASES = [
  { href: '/', label: 'Configure', step: 1 },
  { href: '/prep', label: 'Briefing', step: 2 },
  { href: '/activity', label: 'Workspace', step: 3 },
  { href: '/performance', label: 'Complete', step: 4 },
] as const;

export function NavigationBar() {
  const pathname = usePathname();

  const currentPhaseIndex = PHASES.findIndex((p) => {
    if (p.href === '/') return pathname === '/';
    return pathname.startsWith(p.href);
  });
  const activePhase = currentPhaseIndex >= 0 ? currentPhaseIndex : 0;

  return (
    <header className="sticky top-0 z-50 h-12 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
      <nav className="mx-auto flex h-full max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500 text-[11px] font-bold text-white">
            SA
          </span>
          <span className="hidden sm:inline">SoleAI</span>
        </Link>

        {/* Phase Stepper */}
        <div className="flex items-center gap-0">
          {PHASES.map((phase, index) => (
            <div key={phase.href} className="flex items-center">
              {/* Step indicator */}
              <Link
                href={phase.href}
                className={`flex items-center gap-1.5 px-2 py-1 text-xs transition-colors sm:px-3 ${
                  index === activePhase
                    ? 'text-blue-400'
                    : index < activePhase
                      ? 'text-emerald-400'
                      : 'text-slate-600'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    index === activePhase
                      ? 'bg-blue-500/20 text-blue-400'
                      : index < activePhase
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  {index < activePhase ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5L4.5 7.5L8 2.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    phase.step
                  )}
                </span>
                <span className="hidden sm:inline">{phase.label}</span>
              </Link>

              {/* Connector */}
              {index < PHASES.length - 1 && (
                <div
                  className={`h-px w-4 sm:w-8 ${
                    index < activePhase ? 'bg-emerald-500/50' : 'bg-slate-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="text-xs text-slate-600">
          Phase {activePhase + 1}/{PHASES.length}
        </div>
      </nav>
    </header>
  );
}
