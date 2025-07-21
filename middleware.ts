// middleware.ts
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Arahkan ke dashboard jika pengguna yang sudah login mencoba mengakses halaman utama
    if (req.nextUrl.pathname === "/" && req.nextauth.token) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Pengguna dianggap authorized jika token ada
    },
  }
)

// Konfigurasi ini menentukan rute mana yang akan dilindungi oleh middleware
export const config = {
  matcher: ["/dashboard/:path*", "/transactions/:path*", "/categories/:path*", "/agent/:path*", "/"],
}