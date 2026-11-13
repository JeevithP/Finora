"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Loader2, CalendarRange, Check } from "lucide-react";
import { AnalyticsPeriodKey } from "@/lib/analytics/types";
import {
  PERIOD_PRESETS,
  formatHumanDate,
  formatDate,
  addCalendarDays,
  isValidDateString,
  getCalendarDayDifference,
  MAX_CUSTOM_PERIOD_DAYS,
} from "@/lib/analytics/periods";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AnalyticsPeriodSelectorProps {
  currentPeriod: AnalyticsPeriodKey;
  customFrom?: string;
  customTo?: string;
}

function getTodayCalendarDate(): string {
  const now = new Date();
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function AnalyticsPeriodSelector({
  currentPeriod,
  customFrom,
  customTo,
}: AnalyticsPeriodSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [optimisticPeriod, setOptimisticPeriod] =
    useState<AnalyticsPeriodKey>(currentPeriod);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Form state for custom date inputs
  const today = getTodayCalendarDate();
  const now = new Date();
  const defaultFrom =
    customFrom || formatDate(now.getFullYear(), now.getMonth() + 1, 1);
  const defaultTo = customTo || today;

  const [fromInput, setFromInput] = useState<string>(defaultFrom);
  const [toInput, setToInput] = useState<string>(defaultTo);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticPeriod(currentPeriod);
    if (customFrom) setFromInput(customFrom);
    if (customTo) setToInput(customTo);
  }, [currentPeriod, customFrom, customTo]);

  const handlePresetChange = (newPeriod: AnalyticsPeriodKey) => {
    if (newPeriod === optimisticPeriod && newPeriod !== "custom") return;

    setOptimisticPeriod(newPeriod);

    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("period", newPeriod);
      // Clean up custom params when switching to a preset
      params.delete("from");
      params.delete("to");
      router.replace(`/analytics?${params.toString()}`, { scroll: false });
    });
  };

  const handleApplyCustomRange = (from: string, to: string) => {
    if (!from || !to) {
      setValidationError("Both start and end dates are required.");
      return;
    }

    if (!isValidDateString(from) || !isValidDateString(to)) {
      setValidationError("Please enter valid calendar dates in YYYY-MM-DD format.");
      return;
    }

    if (from > to) {
      setValidationError("Start date cannot be after end date.");
      return;
    }

    const durationDays = getCalendarDayDifference(from, to);
    if (durationDays > MAX_CUSTOM_PERIOD_DAYS) {
      setValidationError(
        `Date range exceeds maximum limit of 10 years (${MAX_CUSTOM_PERIOD_DAYS} days).`
      );
      return;
    }

    setValidationError(null);
    setPopoverOpen(false);
    setOptimisticPeriod("custom");

    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("period", "custom");
      params.set("from", from);
      params.set("to", to);
      router.replace(`/analytics?${params.toString()}`, { scroll: false });
    });
  };

  const handleShortcutClick = (shortcut: "7d" | "30d" | "quarter" | "ytd") => {
    const endStr = getTodayCalendarDate();
    let startStr = "";

    switch (shortcut) {
      case "7d": {
        startStr = addCalendarDays(endStr, -6);
        break;
      }
      case "30d": {
        startStr = addCalendarDays(endStr, -29);
        break;
      }
      case "quarter": {
        const nowDate = new Date();
        const qStartMonth = Math.floor(nowDate.getMonth() / 3) * 3;
        startStr = formatDate(nowDate.getFullYear(), qStartMonth + 1, 1);
        break;
      }
      case "ytd": {
        const nowDate = new Date();
        startStr = formatDate(nowDate.getFullYear(), 1, 1);
        break;
      }
    }

    setFromInput(startStr);
    setToInput(endStr);
    handleApplyCustomRange(startStr, endStr);
  };

  const customLabel =
    customFrom && customTo
      ? `${formatHumanDate(customFrom)} – ${formatHumanDate(customTo)}`
      : "Custom Range";

  return (
    <div className="flex flex-wrap items-center gap-2">
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
              onClick={() => handlePresetChange(preset.key)}
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

        {/* Custom Range Popover Trigger */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={optimisticPeriod === "custom" ? "secondary" : "ghost"}
              size="sm"
              className={`h-8 px-3 text-xs font-medium transition-all gap-1.5 ${
                optimisticPeriod === "custom"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              <span>
                {optimisticPeriod === "custom" ? customLabel : "Custom"}
              </span>
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">
                  Custom Date Range
                </h4>
                <p className="text-xs text-muted-foreground">
                  Select a specific timeframe for your report.
                </p>
              </div>

              {/* Quick Preset Shortcuts */}
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleShortcutClick("7d")}
                  className="h-7 text-xs font-normal"
                >
                  Last 7 Days
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleShortcutClick("30d")}
                  className="h-7 text-xs font-normal"
                >
                  Last 30 Days
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleShortcutClick("quarter")}
                  className="h-7 text-xs font-normal"
                >
                  This Quarter
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleShortcutClick("ytd")}
                  className="h-7 text-xs font-normal"
                >
                  Year to Date
                </Button>
              </div>

              {/* Date Inputs */}
              <div className="space-y-3 pt-1 border-t border-border/60">
                <div className="space-y-1.5">
                  <Label htmlFor="analytics-from" className="text-xs">
                    From Date
                  </Label>
                  <Input
                    id="analytics-from"
                    type="date"
                    value={fromInput}
                    max={toInput || today}
                    onChange={(e) => {
                      setFromInput(e.target.value);
                      setValidationError(null);
                    }}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="analytics-to" className="text-xs">
                    To Date
                  </Label>
                  <Input
                    id="analytics-to"
                    type="date"
                    value={toInput}
                    min={fromInput || undefined}
                    max={today}
                    onChange={(e) => {
                      setToInput(e.target.value);
                      setValidationError(null);
                    }}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>

              {validationError && (
                <p className="text-xs text-destructive font-medium">
                  {validationError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPopoverOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleApplyCustomRange(fromInput, toInput)}
                  className="h-8 text-xs gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  Apply Range
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {isPending && (
          <div className="flex items-center px-2 text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </div>
        )}
      </div>

      {/* Mobile/Tablet Dropdown & Custom Range Button */}
      <div className="lg:hidden flex items-center gap-1.5 bg-card border border-border/80 rounded-xl p-1 shadow-2xs w-full sm:w-auto">
        <Select
          value={optimisticPeriod}
          onValueChange={(val) => {
            if (val === "custom") {
              setPopoverOpen(true);
            } else {
              handlePresetChange(val as AnalyticsPeriodKey);
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs font-semibold border-none bg-transparent shadow-none px-3 focus:ring-0 flex-1">
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin text-primary" />
            ) : (
              <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            )}
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_PRESETS.map((preset) => (
              <SelectItem key={preset.key} value={preset.key} className="text-xs">
                {preset.label}
              </SelectItem>
            ))}
            <SelectItem value="custom" className="text-xs font-medium text-primary">
              Custom Range...
            </SelectItem>
          </SelectContent>
        </Select>

        {optimisticPeriod === "custom" && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs text-primary border-primary/30"
              >
                <CalendarRange className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">Custom Date Range</h4>
                  <p className="text-xs text-muted-foreground">{customLabel}</p>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="m-from" className="text-xs">From</Label>
                    <Input
                      id="m-from"
                      type="date"
                      value={fromInput}
                      onChange={(e) => setFromInput(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="m-to" className="text-xs">To</Label>
                    <Input
                      id="m-to"
                      type="date"
                      value={toInput}
                      onChange={(e) => setToInput(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleApplyCustomRange(fromInput, toInput)}
                  className="w-full h-8 text-xs"
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
