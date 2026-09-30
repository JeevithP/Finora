"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BudgetPeriodSelectorProps {
  month: number;
  year: number;
  onPeriodChange: (month: number, year: number) => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function BudgetPeriodSelector({
  month,
  year,
  onPeriodChange,
}: BudgetPeriodSelectorProps) {
  const handlePrevMonth = () => {
    if (month === 1) {
      onPeriodChange(12, year - 1);
    } else {
      onPeriodChange(month - 1, year);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onPeriodChange(1, year + 1);
    } else {
      onPeriodChange(month + 1, year);
    }
  };

  const handleMonthChange = (val: string) => {
    onPeriodChange(parseInt(val, 10), year);
  };

  const handleYearChange = (val: string) => {
    onPeriodChange(month, parseInt(val, 10));
  };

  const currentYear = new Date().getFullYear();
  const availableYears = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ];

  return (
    <div className="flex items-center gap-2 bg-card border border-border/80 rounded-xl p-1.5 shadow-2xs">
      <Button
        id="prev-month-btn"
        variant="ghost"
        size="icon"
        onClick={handlePrevMonth}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Previous Month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1.5">
        <Select value={String(month)} onValueChange={handleMonthChange}>
          <SelectTrigger className="h-8 text-xs font-semibold border-none bg-transparent shadow-none px-2 focus:ring-0">
            <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue>{MONTH_NAMES[month - 1]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, idx) => (
              <SelectItem key={idx + 1} value={String(idx + 1)} className="text-xs">
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(year)} onValueChange={handleYearChange}>
          <SelectTrigger className="h-8 text-xs font-semibold border-none bg-transparent shadow-none px-2 focus:ring-0">
            <SelectValue>{year}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((yr) => (
              <SelectItem key={yr} value={String(yr)} className="text-xs">
                {yr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        id="next-month-btn"
        variant="ghost"
        size="icon"
        onClick={handleNextMonth}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Next Month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
