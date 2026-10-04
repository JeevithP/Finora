"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyticsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AnalyticsError({ error, reset }: AnalyticsErrorProps) {
  useEffect(() => {
    console.error("Analytics route error boundary captured failure:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground">
        Unable to load analytics
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An error occurred while aggregating financial analytics data. Please try again.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={() => reset()} variant="outline" size="sm" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Retry Analytics
        </Button>
      </div>
    </div>
  );
}
