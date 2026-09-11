import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/types/database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // If environment variables are not set or are placeholders, return standard response without crashing
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("placeholder")) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Fast JWT claims extraction and validation via getClaims() without auth server roundtrip
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims && !error);

  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname === "/login" || pathname === "/signup" || pathname === "/register";

  const isProtectedRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/accounts" ||
    pathname.startsWith("/accounts/") ||
    pathname === "/transactions" ||
    pathname.startsWith("/transactions/") ||
    pathname === "/budgets" ||
    pathname.startsWith("/budgets/") ||
    pathname === "/analytics" ||
    pathname.startsWith("/analytics/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/");

  // 1. Unauthenticated access to protected routes -> Redirect to /login with next param
  if (isProtectedRoute && !isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);

    // Forward any refreshed cookies to the redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return redirectResponse;
  }

  // 2. Authenticated access to auth routes -> Redirect to /dashboard
  if (isAuthRoute && isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);

    // Forward any refreshed cookies to the redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return redirectResponse;
  }

  // 3. Alias /register -> /signup for unauthenticated users
  if (pathname === "/register" && !isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/signup";
    const redirectResponse = NextResponse.redirect(redirectUrl);

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return redirectResponse;
  }

  return supabaseResponse;
}
