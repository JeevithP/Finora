import { cache } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/types/database.types";

/**
 * Request-scoped cached helper to retrieve the authenticated Supabase user.
 * Memoized per-request using React cache() to eliminate duplicate auth round trips
 * between Layout and Page Server Components.
 */
export const getAuthenticatedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});

/**
 * Request-scoped cached helper to retrieve the database profile for a user.
 * Memoized per-request using React cache() to prevent redundant profile queries
 * across Server Components in the same request lifecycle.
 */
export const getUserProfile = cache(
  async (userId?: string): Promise<Profile | null> => {
    const supabase = await createClient();
    let targetUserId = userId;

    if (!targetUserId) {
      const user = await getAuthenticatedUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as Profile;
  }
);

/**
 * Resolves the trusted application origin for auth callbacks and password resets.
 * In production: Uses configured NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL.
 * In development: Falls back to http://localhost:3000.
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
