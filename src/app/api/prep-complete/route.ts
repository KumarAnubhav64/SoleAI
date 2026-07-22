import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_PREP_COMPLETE } from '@/lib/constants';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_PREP_COMPLETE, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark prep complete:', error);
    return NextResponse.json(
      { error: 'Failed to mark prep complete' },
      { status: 500 },
    );
  }
}
