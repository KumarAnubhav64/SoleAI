import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <h2 className="text-4xl font-bold text-foreground">404</h2>
      <p className="text-muted-foreground">This page could not be found.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Return home
      </Link>
    </div>
  );
}
