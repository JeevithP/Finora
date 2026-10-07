"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTrustedAppOrigin } from "@/lib/auth/cached";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type SignupInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

export interface AuthActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  requiresVerification?: boolean;
  message?: string;
}

export async function loginAction(
  input: LoginInput
): Promise<AuthActionResult> {
  const result = loginSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return {
      success: false,
      error: result.error.issues[0]?.message || "Invalid login credentials",
      fieldErrors,
    };
  }

  const { email, password } = result.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
  };
}

export async function signupAction(
  input: SignupInput
): Promise<AuthActionResult> {
  const result = signupSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return {
      success: false,
      error: result.error.issues[0]?.message || "Invalid registration information",
      fieldErrors,
    };
  }

  const { fullName, email, password } = result.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        default_currency: "INR",
      },
    },
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  // If user is returned but session is null, email confirmation is required
  if (data?.user && !data?.session) {
    return {
      success: true,
      requiresVerification: true,
      message:
        "Your account has been created! Please check your email to confirm your account before logging in.",
    };
  }

  return {
    success: true,
    requiresVerification: false,
  };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * REQUEST PASSWORD RESET ACTION
 * Initiates a password reset flow by sending a recovery link via Supabase Auth.
 * Returns a generic success response to prevent account enumeration.
 */
export async function requestPasswordResetAction(
  input: ForgotPasswordInput
): Promise<AuthActionResult> {
  const result = forgotPasswordSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return {
      success: false,
      error: result.error.issues[0]?.message || "Invalid email address",
      fieldErrors,
    };
  }

  const { email } = result.data;
  const supabase = await createClient();

  // Resolve application origin securely against trusted configuration
  const origin = getTrustedAppOrigin();

  const redirectTo = `${origin}/auth/callback?next=/auth/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    // Specific check for rate limiting
    if (error.status === 429) {
      return {
        success: false,
        error: "Too many reset requests. Please wait a few minutes before trying again.",
      };
    }
    // Generic success returned to prevent account enumeration attacks
  }

  return {
    success: true,
    message:
      "If an account exists for this email, you'll receive a password reset link.",
  };
}

/**
 * RESET PASSWORD ACTION
 * Updates the user's password using the active authenticated recovery session.
 */
export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<AuthActionResult> {
  const result = resetPasswordSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return {
      success: false,
      error: result.error.issues[0]?.message || "Invalid password details",
      fieldErrors,
    };
  }

  const { password } = result.data;
  const supabase = await createClient();

  // 1. Verify active user recovery session exists
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error:
        "Your password reset session has expired or is invalid. Please request a new reset link.",
    };
  }

  // 2. Update password in Supabase Auth
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to update password. Please try again.",
    };
  }

  return {
    success: true,
    message: "Your password has been successfully reset. You can now sign in.",
  };
}

