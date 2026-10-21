/**
 * Trusted origin resolution and redirect path sanitization.
 * Safe for use in both Client Components and Server Components.
 */

/**
 * Resolves the trusted application origin for auth callbacks and password resets.
 * In production: Uses configured NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL.
 * In development: Falls back to http://localhost:3000 or verified loopback origin.
 * Prevents host header injection attacks by never trusting arbitrary incoming host headers.
 */
export function getTrustedAppOrigin(fallbackUrl?: string): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (fallbackUrl) {
    try {
      const parsed = new URL(fallbackUrl);
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "[::1]"
      ) {
        return parsed.origin;
      }
    } catch {
      // ignore parsing failure
    }
  }

  return "http://localhost:3000";
}

/**
 * Validates and sanitizes a redirect target path to prevent open redirect vulnerabilities.
 * Ensures the path starts with a single '/' and does not contain protocol-relative slashes '//'
 * or backslashes '\\'.
 */
export function sanitizeNextPath(rawNext?: string | null): string {
  if (
    !rawNext ||
    typeof rawNext !== "string" ||
    !rawNext.startsWith("/") ||
    rawNext.startsWith("//") ||
    rawNext.includes("\\")
  ) {
    return "/dashboard";
  }

  return rawNext;
}

/**
 * Constructs a fully qualified, trusted OAuth callback URL.
 * Guarantees that the origin is trusted and the 'next' parameter is a safe relative path.
 */
export function getOAuthCallbackUrl(
  nextParam?: string | null,
  fallbackOrigin?: string
): string {
  const origin = getTrustedAppOrigin(fallbackOrigin);
  const safeNext = sanitizeNextPath(nextParam);
  return `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
