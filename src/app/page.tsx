import { Suspense } from 'react';
import { ConfigGrid } from '@/components/job-config/ConfigGrid';
import { Skeleton } from '@/components/ui/skeleton';

function ConfigGridFallback() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-12 w-[200px] rounded-lg" />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
          Job Configuration
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Select your equipment and issue severity to begin the mission
        </p>
      </div>

      {/* Config Grid */}
      <Suspense fallback={<ConfigGridFallback />}>
        <ConfigGrid />
      </Suspense>
    </main>
  );
}
