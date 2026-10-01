"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle, MailCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";
import { requestPasswordResetAction } from "@/actions/auth";
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

function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setServerError(null);
    try {
      const result = await requestPasswordResetAction(data);

      if (!result.success) {
        setServerError(result.error || "Failed to process password reset request");
        toast.error("Request failed", {
          description: result.error || "Please check the email address and try again.",
        });
        return;
      }

      setSubmittedEmail(data.email);
      toast.success("Reset link sent", {
        description: "If an account exists, you will receive a password reset link shortly.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setServerError(message);
      toast.error("Request error", { description: message });
    }
  };

  if (submittedEmail) {
    return (
      <Card className="shadow-md border-border/80">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Check your email
          </CardTitle>
          <CardDescription className="text-sm">
            If an account exists for{" "}
            <strong className="text-foreground font-medium">{submittedEmail}</strong>,
            you will receive a password reset link shortly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-muted-foreground text-center">
          <p>
            Be sure to check your spam or junk folders if you don&apos;t see the email in your inbox within a few minutes.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-2">
          <Button asChild className="w-full font-medium">
            <Link href="/login">Return to Sign In</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-xs"
            onClick={() => setSubmittedEmail(null)}
          >
            Try another email address
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-border/80">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Forgot Password
        </CardTitle>
        <CardDescription>
          Enter your registered email address and we&apos;ll send you a link to reset your password.
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

          {/* Email field */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              disabled={isSubmitting}
              {...register("email")}
              className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.email && (
              <p className="text-xs text-destructive font-medium">
                {errors.email.message}
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
                Sending reset link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ForgotPasswordPage() {
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
        <ForgotPasswordForm />
      </Suspense>
    </AuthCardLayout>
  );
}
