import { NextRequest, NextResponse } from "next/server";

const publicRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.includes(pathname);

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/repositories/:path*",
    "/engineering/:path*",
    "/architecture/:path*",
    "/security/:path*",
    "/documentation/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
    "/forgot-password",
  ],
};