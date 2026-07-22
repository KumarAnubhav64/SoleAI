import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  COOKIE_TAB_1_COMPLETE,
  COOKIE_TAB_2_COMPLETE,
  COOKIE_TAB_3_COMPLETE,
} from '@/lib/constants';

const tabCookieMap: Record<string, string> = {
  scoping: COOKIE_TAB_1_COMPLETE,
  repair: COOKIE_TAB_2_COMPLETE,
  qa: COOKIE_TAB_3_COMPLETE,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tabId } = body;

    if (!tabId || !tabCookieMap[tabId]) {
      return NextResponse.json(
        { error: `Invalid tabId: ${tabId}` },
        { status: 400 },
      );
    }

    const cookieName = tabCookieMap[tabId];
    const cookieStore = await cookies();
    cookieStore.set(cookieName, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to complete tab:', error);
    return NextResponse.json(
      { error: 'Failed to complete tab' },
      { status: 500 },
    );
  }
}
