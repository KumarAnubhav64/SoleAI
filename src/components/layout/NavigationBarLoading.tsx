import { Skeleton } from '@/components/ui/skeleton';

export function NavigationBarLoading() {
  return (
    <header className="sticky top-0 z-50 h-12 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
      <nav className="mx-auto flex h-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="hidden h-4 w-14 sm:inline-block" />
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-12" />
          ))}
        </div>
        <Skeleton className="h-4 w-16" />
      </nav>
    </header>
  );
}
