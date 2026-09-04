import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === '/' && searchParams.has('join')) {
    const code = searchParams.get('join')?.toUpperCase();
    if (code) {
      return NextResponse.redirect(new URL(`/battle/${code}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
