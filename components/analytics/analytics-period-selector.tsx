"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import { AnalyticsPeriodKey } from "@/lib/analytics/types";
import { PERIOD_PRESETS } from "@/lib/analytics/periods";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface AnalyticsPeriodSelectorProps {
  currentPeriod: AnalyticsPeriodKey;
}

export function AnalyticsPeriodSelector({
  currentPeriod,
}: AnalyticsPeriodSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [optimisticPeriod, setOptimisticPeriod] =
    useState<AnalyticsPeriodKey>(currentPeriod);

  useEffect(() => {
    setOptimisticPeriod(currentPeriod);
  }, [currentPeriod]);

  const handlePeriodChange = (newPeriod: string) => {
    const periodKey = newPeriod as AnalyticsPeriodKey;
    if (periodKey === optimisticPeriod) return;

    // 1. Instant 0ms optimistic visual state update
    setOptimisticPeriod(periodKey);

    // 2. Non-blocking background RSC transition
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("period", periodKey);
      router.replace(`/analytics?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Desktop Pill Buttons */}
      <div className="hidden lg:flex items-center gap-1 bg-card border border-border/80 rounded-xl p-1 shadow-2xs">
        {PERIOD_PRESETS.map((preset) => {
          const isActive = optimisticPeriod === preset.key;
          return (
            <Button
              key={preset.key}
              data-period={preset.key}
              data-testid="period-button"
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handlePeriodChange(preset.key)}
              className={`h-8 px-3 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {preset.label}
            </Button>
          );
        })}
        {isPending && (
          <div className="flex items-center px-2 text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </div>
        )}
      </div>

      {/* Mobile/Tablet Dropdown Select */}
      <div className="lg:hidden flex items-center gap-1.5 bg-card border border-border/80 rounded-xl p-1 shadow-2xs">
        <Select value={optimisticPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="h-8 text-xs font-semibold border-none bg-transparent shadow-none px-3 focus:ring-0">
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin text-primary" />
            ) : (
              <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            )}
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_PRESETS.map((preset) => (
              <SelectItem
                key={preset.key}
                value={preset.key}
                className="text-xs"
              >
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
