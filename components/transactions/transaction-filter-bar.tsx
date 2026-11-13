"use client";

import React, { useState, useEffect } from "react";
import { Search, X, Calendar, CalendarRange, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Account, Category } from "@/types/database.types";
import { TRANSACTION_TYPES } from "@/lib/constants";
import {
  formatHumanDate,
  isValidDateString,
  formatDate,
  addCalendarDays,
} from "@/lib/analytics/periods";

interface TransactionFilterBarProps {
  accounts: Account[];
  categories: Category[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedAccount: string;
  onAccountChange: (acc: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  fromDate?: string;
  toDate?: string;
  onDateRangeChange: (from?: string, to?: string) => void;
  onResetFilters: () => void;
}

function getTodayCalendarDate(): string {
  const now = new Date();
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function TransactionFilterBar({
  accounts,
  categories,
  searchQuery,
  onSearchChange,
  selectedAccount,
  onAccountChange,
  selectedType,
  onTypeChange,
  selectedCategory,
  onCategoryChange,
  fromDate,
  toDate,
  onDateRangeChange,
  onResetFilters,
}: TransactionFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [tempFrom, setTempFrom] = useState(fromDate || "");
  const [tempTo, setTempTo] = useState(toDate || "");
  const [dateError, setDateError] = useState<string | null>(null);

  // Synchronize when external reset or searchQuery changes
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setTempFrom(fromDate || "");
    setTempTo(toDate || "");
  }, [fromDate, toDate]);

  // Debounce search query changes by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, onSearchChange]);

  const handleClearSearch = () => {
    setLocalSearch("");
    onSearchChange("");
  };

  const handleResetFilters = () => {
    setLocalSearch("");
    setTempFrom("");
    setTempTo("");
    onResetFilters();
  };

  const handleApplyDateRange = () => {
    if (tempFrom && !isValidDateString(tempFrom)) {
      setDateError("Invalid start date.");
      return;
    }
    if (tempTo && !isValidDateString(tempTo)) {
      setDateError("Invalid end date.");
      return;
    }
    if (tempFrom && tempTo && tempFrom > tempTo) {
      setDateError("Start date cannot be after end date.");
      return;
    }

    setDateError(null);
    setDatePopoverOpen(false);
    onDateRangeChange(tempFrom || undefined, tempTo || undefined);
  };

  const handleClearDateRange = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTempFrom("");
    setTempTo("");
    setDateError(null);
    setDatePopoverOpen(false);
    onDateRangeChange(undefined, undefined);
  };

  const handlePresetShortcut = (preset: "this_month" | "last_month" | "30d" | "this_year") => {
    const now = new Date();
    const todayStr = getTodayCalendarDate();
    let from = "";
    let to = todayStr;

    switch (preset) {
      case "this_month": {
        from = formatDate(now.getFullYear(), now.getMonth() + 1, 1);
        to = todayStr;
        break;
      }
      case "last_month": {
        const lastMonthYear =
          now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const daysInLastMonth = new Date(
          Date.UTC(lastMonthYear, lastMonth, 0)
        ).getUTCDate();
        from = formatDate(lastMonthYear, lastMonth, 1);
        to = formatDate(lastMonthYear, lastMonth, daysInLastMonth);
        break;
      }
      case "30d": {
        to = todayStr;
        from = addCalendarDays(todayStr, -29);
        break;
      }
      case "this_year": {
        from = formatDate(now.getFullYear(), 1, 1);
        to = todayStr;
        break;
      }
    }

    setTempFrom(from);
    setTempTo(to);
    setDateError(null);
    setDatePopoverOpen(false);
    onDateRangeChange(from, to);
  };

  const hasDateFilter = Boolean(fromDate || toDate);
  const hasActiveFilters =
    localSearch.trim() !== "" ||
    selectedAccount !== "all" ||
    selectedType !== "all" ||
    selectedCategory !== "all" ||
    hasDateFilter;

  const dateButtonLabel =
    fromDate && toDate
      ? `${formatHumanDate(fromDate)} – ${formatHumanDate(toDate)}`
      : fromDate
      ? `From ${formatHumanDate(fromDate)}`
      : toDate
      ? `Up to ${formatHumanDate(toDate)}`
      : "Date Range";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search description, notes, or account..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 pr-8 text-xs h-9 bg-background"
        />
        {localSearch && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Popover Filter */}
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-9 text-xs gap-1.5 transition-all ${
                hasDateFilter
                  ? "border-primary/50 text-primary bg-primary/5 hover:bg-primary/10 font-medium"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {hasDateFilter ? (
                <CalendarRange className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="max-w-[170px] truncate">{dateButtonLabel}</span>
              {hasDateFilter && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClearDateRange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleClearDateRange();
                    }
                  }}
                  className="ml-1 rounded-xs p-0.5 hover:bg-primary/20 text-primary"
                  title="Clear date range"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-80 p-4" align="start">
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">
                  Filter by Date Range
                </h4>
                <p className="text-xs text-muted-foreground">
                  Show transactions within specific dates.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetShortcut("this_month")}
                  className="h-7 text-xs font-normal"
                >
                  This Month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetShortcut("last_month")}
                  className="h-7 text-xs font-normal"
                >
                  Last Month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetShortcut("30d")}
                  className="h-7 text-xs font-normal"
                >
                  Last 30 Days
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetShortcut("this_year")}
                  className="h-7 text-xs font-normal"
                >
                  This Year
                </Button>
              </div>

              {/* Date Inputs */}
              <div className="space-y-3 pt-1 border-t border-border/60">
                <div className="space-y-1.5">
                  <Label htmlFor="tx-from" className="text-xs">
                    From Date
                  </Label>
                  <Input
                    id="tx-from"
                    type="date"
                    value={tempFrom}
                    max={tempTo || undefined}
                    onChange={(e) => {
                      setTempFrom(e.target.value);
                      setDateError(null);
                    }}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tx-to" className="text-xs">
                    To Date
                  </Label>
                  <Input
                    id="tx-to"
                    type="date"
                    value={tempTo}
                    min={tempFrom || undefined}
                    onChange={(e) => {
                      setTempTo(e.target.value);
                      setDateError(null);
                    }}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>

              {dateError && (
                <p className="text-xs text-destructive font-medium">
                  {dateError}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearDateRange}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDatePopoverOpen(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyDateRange}
                    className="h-8 text-xs gap-1"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Account Filter */}
        <div className="w-full sm:w-auto min-w-[130px]">
          <Select value={selectedAccount} onValueChange={onAccountChange}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: acc.color || "#3b82f6" }}
                    />
                    <span>{acc.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type Filter */}
        <div className="w-full sm:w-auto min-w-[110px]">
          <Select value={selectedType} onValueChange={onTypeChange}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TRANSACTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="capitalize">{t.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="w-full sm:w-auto min-w-[130px]">
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: c.color || "#64748b" }}
                    />
                    <span>{c.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
