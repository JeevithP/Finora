import { createClient } from "@/lib/supabase/server";
import { getTrustedAppOrigin, sanitizeNextPath } from "@/lib/auth/origin";
import { mapOAuthError } from "@/lib/auth/errors";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const appOrigin = getTrustedAppOrigin(origin);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  // Determine target redirection destination with strict path sanitization
  const defaultNext = type === "recovery" ? "/auth/reset-password" : "/dashboard";
  const rawNext = searchParams.get("next");
  const next = rawNext ? sanitizeNextPath(rawNext) : defaultNext;

  // Handle errors redirected from Supabase or OAuth providers (safe error mapping)
  if (error || errorCode) {
    const safeErrorCode = mapOAuthError(error, errorDescription, errorCode);
    const errorTarget = type === "recovery" ? "/auth/forgot-password" : "/login";
    return NextResponse.redirect(
      `${appOrigin}${errorTarget}?error=${safeErrorCode}`
    );
  }


  const supabase = await createClient();

  // 1. PKCE Authorization Code Exchange (Server-side Auth Flow)
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(`${appOrigin}${next}`);
    }
    // Exchange failure: return to login with safe error code
    return NextResponse.redirect(`${appOrigin}/login?error=exchange_failed`);
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

  // Fallback on failure: return to appropriate auth page with whitelisted error code
  const fallbackTarget = type === "recovery" ? "/auth/forgot-password" : "/login";
  return NextResponse.redirect(`${appOrigin}${fallbackTarget}?error=auth_failed`);
}

