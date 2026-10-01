"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import { resetPasswordAction } from "@/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";

function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (user && !error) {
          setHasValidSession(true);
        } else {
          setHasValidSession(false);
        }
      } catch {
        setHasValidSession(false);
      } finally {
        setIsCheckingSession(false);
      }
    }

    checkSession();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setServerError(null);
    try {
      const result = await resetPasswordAction(data);

      if (!result.success) {
        setServerError(result.error || "Failed to update password");
        toast.error("Password reset failed", {
          description: result.error || "Please check the form and try again.",
        });
        return;
      }

      setIsSuccess(true);
      toast.success("Password updated", {
        description: "Your password has been successfully reset.",
      });

      // Sign out recovery session so user can log in with new password cleanly
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setServerError(message);
      toast.error("Reset error", { description: message });
    }
  };

  if (isCheckingSession) {
    return (
      <Card className="shadow-md border-border/80 p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-3 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Verifying password reset session...
          </p>
        </div>
      </Card>
    );
  }

  // Missing or expired recovery session
  if (!hasValidSession) {
    return (
      <Card className="shadow-md border-border/80">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Invalid or Expired Link
          </CardTitle>
          <CardDescription className="text-sm">
            This password reset link is invalid or has expired. Password reset links are single-use and expire after a short period.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-muted-foreground text-center">
          <p>
            Please request a new reset link to securely update your account password.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-2">
          <Button asChild className="w-full font-medium">
            <Link href="/auth/forgot-password">Request New Reset Link</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full text-xs">
            <Link href="/login">Return to Sign In</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Password reset success confirmation
  if (isSuccess) {
    return (
      <Card className="shadow-md border-border/80">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Password Updated
          </CardTitle>
          <CardDescription className="text-sm">
            Your password has been successfully reset. You can now sign in to your Finora account with your new credentials.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col space-y-3 pt-4">
          <Button asChild className="w-full font-medium">
            <Link href="/login">Sign In with New Password</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-border/80">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Reset Password
          </CardTitle>
        </div>
        <CardDescription>
          Create a new, strong password for your Finora account.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="leading-snug">{serverError}</div>
            </div>
          )}

          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isSubmitting}
                {...register("password")}
                className={`pr-10 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive font-medium">
                {errors.password.message}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Must be at least 8 characters long.
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isSubmitting}
                {...register("confirmPassword")}
                className={`pr-10 ${errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive font-medium">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-2">
          <Button
            type="submit"
            className="w-full font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating password...
              </>
            ) : (
              "Save New Password"
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Cancel and Return to Sign In
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCardLayout>
      <Suspense
        fallback={
          <Card className="shadow-md border-border/80 animate-pulse p-8">
            <div className="h-8 bg-muted rounded-md w-1/3 mb-4" />
            <div className="h-4 bg-muted rounded-md w-2/3 mb-8" />
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded-md" />
              <div className="h-10 bg-muted rounded-md" />
            </div>
          </Card>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthCardLayout>
  );
}
