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
