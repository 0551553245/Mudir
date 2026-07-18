import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { ROLE_ROUTES, type UserRole } from "./lib/supabase/types";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/manager/login",
  "/admin/login",
  "/owner/login",
  "/owner/register",
  "/forgot-password",
  "/reset-password",
  "/privacy-policy",
  "/terms-of-service",
  "/refund-policy",
];
const AUTH_PATHS = [
  "/login",
  "/signup",
  "/manager/login",
  "/admin/login",
  "/owner/login",
  "/owner/register",
  "/forgot-password",
];

function stripLocale(pathname: string): { locale: string; path: string } {
  const segments = pathname.split("/");
  const locale = segments[1];
  const path = "/" + segments.slice(2).join("/");
  return { locale, path: path === "/" ? "" : path };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(request);
  const { path } = stripLocale(pathname);

  let supabaseResponse = intlResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Parameters<typeof supabaseResponse.cookies.set>[2];
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => path === p);
  const isVerify2fa = path === "/verify-2fa";
  const isResetPassword = path === "/reset-password";

  if (!user && !isPublic && path !== "" && path !== "/") {
    const locale = pathname.split("/")[1] || routing.defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = path.startsWith("/admin")
      ? `/${locale}/admin/login`
      : path.startsWith("/manager")
        ? `/${locale}/manager/login`
        : `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  if (!user && isVerify2fa) {
    const locale = pathname.split("/")[1] || routing.defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, first_login_verified_at")
      .eq("id", user.id)
      .single();

    const needsFirstLogin2fa = Boolean(
      profile && !profile.first_login_verified_at
    );
    const locale = pathname.split("/")[1] || routing.defaultLocale;

    if (needsFirstLogin2fa && !isVerify2fa && !isResetPassword) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/verify-2fa`;
      return NextResponse.redirect(url);
    }

    if (!needsFirstLogin2fa && isVerify2fa && profile?.role) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${ROLE_ROUTES[profile.role as UserRole]}`;
      return NextResponse.redirect(url);
    }

    if (user && isAuthPage && !needsFirstLogin2fa) {
      if (profile?.role) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}${ROLE_ROUTES[profile.role as UserRole]}`;
        return NextResponse.redirect(url);
      }
    }

    if (user && !isPublic && !isVerify2fa && !isResetPassword) {
      const role = profile?.role as UserRole | undefined;
      if (role) {
        const allowedPrefix = ROLE_ROUTES[role];
        if (
          (path.startsWith("/owner") ||
            path.startsWith("/manager") ||
            path.startsWith("/admin")) &&
          !path.startsWith(allowedPrefix)
        ) {
          const url = request.nextUrl.clone();
          url.pathname = `/${locale}${allowedPrefix}`;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
