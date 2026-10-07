import { createClient } from "@/lib/supabase/server";
import { getTrustedAppOrigin } from "@/lib/auth/cached";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const appOrigin = getTrustedAppOrigin(origin);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Determine target redirection destination
  let next = searchParams.get("next") ?? (type === "recovery" ? "/auth/reset-password" : "/dashboard");

  // Prevent open redirect vulnerabilities: Ensure next is a safe relative path starting with single '/'
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    next = type === "recovery" ? "/auth/reset-password" : "/dashboard";
  }

  // Handle errors redirected from Supabase (e.g., expired or invalid token links)
  if (error) {
    const errorTarget = type === "recovery" ? "/auth/forgot-password" : "/login";
    return NextResponse.redirect(
      `${appOrigin}${errorTarget}?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  const supabase = await createClient();

  // 1. PKCE Authorization Code Exchange (Server-side Auth Flow)
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(`${appOrigin}${next}`);
    }
  }

  // 2. Token Hash OTP Verification (Magic link / Token-based Recovery Flow)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });
    if (!verifyError) {
      return NextResponse.redirect(`${appOrigin}${next}`);
    }
  }

  // Fallback on failure: return to appropriate auth page with error notification
  const fallbackTarget = type === "recovery" ? "/auth/forgot-password" : "/login";
  return NextResponse.redirect(`${appOrigin}${fallbackTarget}?error=auth-callback-failed`);
}

