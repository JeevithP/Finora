"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
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
