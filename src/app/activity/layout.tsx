import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Activity layout — server-side route guard.
 *
 * Double-checks the prepComplete cookie before rendering the
 * Phase 3 split-screen workspace. This is a secondary guard
 * after the middleware, providing defense-in-depth.
 */
export default async function ActivityLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const prepComplete = cookieStore.get('prepComplete')?.value;

  if (prepComplete !== 'true') {
    const configComplete = cookieStore.get('configComplete')?.value;
    if (configComplete === 'true') {
      redirect('/prep');
    }
    redirect('/');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
