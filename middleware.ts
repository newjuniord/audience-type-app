import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
