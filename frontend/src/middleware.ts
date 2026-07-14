import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Yalnızca /admin ile başlayan rotaları koru
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Çerezlerden veya Header'dan token kontrolü
    const token = request.cookies.get('token')?.value;

    if (!token) {
      // Token yoksa login sayfasına yönlendir
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Not: Edge runtime'da jsonwebtoken kütüphanesi tam çalışmaz (Node API eksikliği).
    // Gerçek bir sistemde jose kütüphanesi kullanılır veya sadece token varlığına bakılır 
    // ve asıl doğrulama API tarafında yapılır. Biz şimdilik token varlığını kontrol ediyoruz.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
