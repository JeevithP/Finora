/**
 * Centralized, safe OAuth error mapping.
 * Prevents reflection of untrusted third-party error messages in the DOM.
 */

export type AuthErrorCode =
  | "access_denied"
  | "account_collision"
  | "exchange_failed"
  | "auth_failed"
  | "session_expired"
  | "unexpected_error";

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  access_denied: "Google sign-in was canceled or access was denied. Please try again.",
  account_collision:
    "An account already exists with this email address. Please sign in with your email and password.",
  exchange_failed: "Authentication could not be completed. Please try signing in again.",
  auth_failed: "Authentication failed. Please try again or use your email and password.",
  session_expired: "Your session has expired. Please sign in again.",
  unexpected_error: "An unexpected error occurred. Please try again.",
};

// Known exact error tokens from OAuth 2.0 (RFC 6749) and Supabase Auth
const ACCESS_DENIED_CODES = new Set(["access_denied", "user_denied"]);

const COLLISION_CODES = new Set([
  "identity_already_exists",
  "user_already_exists",
  "email_exists",
  "multiple_accounts_with_the_same_email",
]);

const EXCHANGE_CODES = new Set([
  "invalid_grant",
  "bad_code_verifier",
  "code_challenge_mismatch",
  "exchange_error",
  "exchange_failed",
]);

/**
 * Maps raw OAuth error queries and descriptions into a small, safe set of whitelisted error codes.
 * Uses exact code matching and bounded description phrases instead of broad substring checks.
 */
export function mapOAuthError(
  error: string | null,
  errorDescription?: string | null,
  errorCode?: string | null
): AuthErrorCode {
  if (!error && !errorDescription && !errorCode) {
    return "unexpected_error";
  }

  const err = (error || "").toLowerCase().trim();
  const code = (errorCode || "").toLowerCase().trim();
  const desc = (errorDescription || "").toLowerCase().trim();

  // 1. Existing email/password account collision (takes precedence over generic access_denied wrapper)
  if (
    COLLISION_CODES.has(err) ||
    COLLISION_CODES.has(code) ||
    desc.includes("an account with this email address already exists") ||
    desc.includes("user already registered") ||
    desc.includes("multiple accounts with the same email") ||
    desc.includes("identity already exists")
  ) {
    return "account_collision";
  }

  // 2. Google user cancellation / access denied
  if (
    ACCESS_DENIED_CODES.has(err) ||
    ACCESS_DENIED_CODES.has(code) ||
    desc.includes("user denied access") ||
    desc.includes("user denied consent") ||
    desc.includes("consent was denied") ||
    desc.includes("consent was canceled") ||
    desc.includes("consent was cancelled") ||
    desc.includes("user canceled") ||
    desc.includes("user cancelled")
  ) {
    return "access_denied";
  }


  // 3. PKCE authorization code / token exchange failure
  if (
    EXCHANGE_CODES.has(err) ||
    EXCHANGE_CODES.has(code) ||
    desc.includes("invalid authorization code") ||
    desc.includes("authorization code has expired") ||
    desc.includes("authorization code has already been used") ||
    desc.includes("bad code verifier") ||
    desc.includes("code verifier") ||
    desc.includes("code exchange failed") ||
    desc.includes("pkce verification failed")
  ) {
    return "exchange_failed";
  }

  // 4. Default safe fallback for all other or unknown errors
  return "auth_failed";
}

/**
 * Resolves a safe user-facing error message from a code.
 * Guaranteed never to return arbitrary or unvetted text.
 */
export function getSafeErrorMessage(code?: string | null): string | null {
  if (!code || typeof code !== "string") return null;
  const trimmed = code.trim();
  if (!trimmed) return null;

  if (Object.prototype.hasOwnProperty.call(AUTH_ERROR_MESSAGES, trimmed)) {
    return AUTH_ERROR_MESSAGES[trimmed as AuthErrorCode];
  }

  return AUTH_ERROR_MESSAGES.unexpected_error;
}
