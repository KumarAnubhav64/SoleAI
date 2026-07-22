import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Route protection middleware.
 *
 * Guards:
 *   /prep        ← requires configComplete cookie (completed Phase 1)
 *   /activity    ← requires prepComplete cookie (completed Phase 2)
 *   /performance ← requires tab3Complete cookie (completed all tabs)
 *
 * If the required cookie is missing, the user is redirected to
 * the first uncompleted phase.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Prep (Phase 2) — requires config from Phase 1 ──
  if (pathname.startsWith('/prep')) {
    const configComplete = request.cookies.get('configComplete')?.value;
    if (configComplete !== 'true') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ── Activity (Phase 3) — requires completed prep ──
  if (pathname.startsWith('/activity')) {
    const prepComplete = request.cookies.get('prepComplete')?.value;
    if (prepComplete !== 'true') {
      // If they have config but not prep, send to prep
      const configComplete = request.cookies.get('configComplete')?.value;
      if (configComplete === 'true') {
        return NextResponse.redirect(new URL('/prep', request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ── Performance — requires all tabs completed ──
  if (pathname.startsWith('/performance')) {
    const tab3Complete = request.cookies.get('tab3Complete')?.value;
    if (tab3Complete !== 'true') {
      // Fall back through the chain
      const prepComplete = request.cookies.get('prepComplete')?.value;
      if (prepComplete === 'true') {
        return NextResponse.redirect(new URL('/activity', request.url));
      }
      const configComplete = request.cookies.get('configComplete')?.value;
      if (configComplete === 'true') {
        return NextResponse.redirect(new URL('/prep', request.url));
      }
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/prep', '/activity', '/performance'],
};
