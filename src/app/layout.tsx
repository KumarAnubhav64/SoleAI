import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SoleAI - Remote Field Technician Support Portal',
  description:
    'A guided, time-boxed, multi-phase workflow for field technicians to configure jobs, review safety instructions, and connect with a Remote Expert System.',
};

import { NavigationBar } from '@/components/layout/NavigationBar';
import { NavigationBarLoading } from '@/components/layout/NavigationBarLoading';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="h-screen flex flex-col bg-slate-950 text-slate-100">
        <Suspense fallback={<NavigationBarLoading />}>
          <NavigationBar />
        </Suspense>
        <main className="flex-1 flex flex-col">{children}</main>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: { fontSize: '0.875rem', borderRadius: '0.75rem' },
          }}
        />
      </body>
    </html>
  );
}
