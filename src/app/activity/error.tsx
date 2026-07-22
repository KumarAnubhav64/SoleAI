'use client';

export default function ActivityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <h2 className="text-2xl font-semibold text-foreground">Workspace Error</h2>
      <p className="text-muted-foreground text-sm max-w-md text-center">
        {error.message || 'The support workspace encountered an error.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Reload workspace
      </button>
    </div>
  );
}
