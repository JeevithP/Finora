"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getOAuthCallbackUrl } from "@/lib/auth/origin";
import { Button } from "@/components/ui/button";

interface GoogleSignInButtonProps {
  next?: string;
  text?: string;
  disabled?: boolean;
  className?: string;
}

export function GoogleSignInButton({
  next = "/dashboard",
  text = "Continue with Google",
  disabled = false,
  className = "",
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);

    try {
      const supabase = createClient();
      const fallbackOrigin =
        typeof window !== "undefined" ? window.location.origin : undefined;
      const redirectTo = getOAuthCallbackUrl(next, fallbackOrigin);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setIsLoading(false);
        toast.error("Google Sign-In failed", {
          description: "Could not initiate Google authentication. Please try again.",
        });
      }
    } catch {
      setIsLoading(false);
      toast.error("Google Sign-In error", {
        description: "An unexpected error occurred while initiating Google sign-in.",
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleSignIn}
      disabled={disabled || isLoading}
      className={`w-full font-medium h-10 border-border/80 hover:bg-muted/50 transition-colors shadow-sm ${className}`}
      aria-label={text}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>Connecting to Google...</span>
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4 mr-2.5 shrink-0"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{text}</span>
        </>
      )}
    </Button>
  );
}
