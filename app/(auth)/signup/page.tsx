"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, EyeOff, AlertCircle, MailCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { signupAction } from "@/actions/auth";
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

export default function SignupPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignupInput) => {
    setServerError(null);
    try {
      const result = await signupAction(data);

      if (!result.success) {
        setServerError(result.error || "Failed to create account");
        toast.error("Registration failed", {
          description: result.error || "Please verify your details and try again.",
        });
        return;
      }

      if (result.requiresVerification) {
        setUserEmail(data.email);
        setVerificationRequired(true);
        toast.info("Verification email sent", {
          description: "Please check your inbox to confirm your account.",
        });
        return;
      }

      toast.success("Account created successfully!", {
        description: "Welcome to Finora.",
      });

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setServerError(message);
      toast.error("Registration error", { description: message });
    }
  };

  // If email verification is enabled on Supabase, show confirmation card
  if (verificationRequired) {
    return (
      <Card className="shadow-md border-border/80 text-center">
        <CardHeader className="space-y-3 pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Check Your Email
          </CardTitle>
          <CardDescription className="text-sm">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-foreground">{userEmail}</span>.
            Please verify your email address to activate your Finora account.
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex flex-col space-y-3 pt-2">
          <Link href="/login" className="w-full">
            <Button className="w-full gap-2 font-medium">
              Go to Sign In <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or try signing in to resend.
          </p>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-border/80">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Create Account
        </CardTitle>
        <CardDescription>
          Get started with Finora to take control of your financial journey
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="leading-snug">{serverError}</div>
            </div>
          )}

          {/* Full Name field */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Alex Johnson"
              autoComplete="name"
              disabled={isSubmitting}
              {...register("fullName")}
              className={errors.fullName ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive font-medium">
                {errors.fullName.message}
              </p>
            )}
          </div>

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

          {/* Password field */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
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
          </div>

          {/* Confirm Password field */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
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
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
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
                Creating account...
              </>
            ) : (
              "Create Free Account"
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
