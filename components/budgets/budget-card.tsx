"use client";

import React, { useState } from "react";
import {
  MoreVertical,
  Edit3,
  Trash2,
  AlertCircle,
  Tag,
  Utensils,
  Home,
  ShoppingCart,
  Car,
  Zap,
  Film,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  Sparkles,
  CircleEllipsis,
} from "lucide-react";

import { BudgetWithCategory } from "@/actions/budgets";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditBudgetDialog } from "./edit-budget-dialog";
import { DeleteBudgetDialog } from "./delete-budget-dialog";

const ICON_MAP: Record<string, React.ElementType> = {
  Tag,
  Utensils,
  Home,
  ShoppingCart,
  Car,
  Zap,
  Film,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  Sparkles,
  CircleEllipsis,
};

interface BudgetCardProps {
  budget: BudgetWithCategory;
  netSpent: number;
  rawNetSpent: number;
  defaultCurrency: string;
  foreignCount?: number;
}

export function BudgetCard({
  budget,
  netSpent,
  rawNetSpent,
  defaultCurrency,
  foreignCount = 0,
}: BudgetCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const budgetAmount = Number(budget.amount);
  const isOver = rawNetSpent > budgetAmount;
  const remaining = budgetAmount - netSpent;
  const percentage = budgetAmount > 0 ? (netSpent / budgetAmount) * 100 : 0;
  const clampedProgress = Math.min(percentage, 100);

  // Icon component resolution
  const IconComponent =
    ICON_MAP[budget.category?.icon || ""] || Tag;
  const color = budget.category?.color || "#3b82f6";

  // Progress Bar Indicator Color
  let indicatorColor = "bg-emerald-500";
  if (isOver) {
    indicatorColor = "bg-rose-500";
  } else if (percentage >= 80) {
    indicatorColor = "bg-amber-500";
  }

  return (
    <>
      <Card className="group relative overflow-hidden border-border/80 bg-card shadow-2xs hover:shadow-xs transition-all">
        {/* Category Color Accent Strip */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5"
          style={{ backgroundColor: color }}
        />

        <CardContent className="p-5 pl-6 space-y-4">
          {/* Top Bar: Icon, Name, Category Tag, Actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: `${color}15`,
                  color: color,
                }}
              >
                <IconComponent className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold text-foreground text-sm leading-snug">
                  {budget.category?.name || "Uncategorized"}
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Expense Category
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {isOver && (
                <Badge
                  variant="destructive"
                  className="text-[10px] px-1.5 py-0 bg-rose-500/10 text-rose-600 border-rose-500/20 font-medium"
                >
                  Over Budget
                </Badge>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Budget actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem
                    onClick={() => setEditOpen(true)}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit Amount</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Budget</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Amount Metric Row */}
          <div className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">
                Spent:{" "}
                <strong className="text-foreground font-semibold">
                  {formatCurrency(netSpent, defaultCurrency)}
                </strong>
                {rawNetSpent < 0 && (
                  <span className="text-[10px] text-emerald-600 ml-1 font-medium">
                    (Net credit: {formatCurrency(Math.abs(rawNetSpent), defaultCurrency)})
                  </span>
                )}
              </span>
              <span className="font-mono text-muted-foreground">
                of {formatCurrency(budgetAmount, defaultCurrency)}
              </span>
            </div>

            {/* Progress Bar */}
            <Progress
              value={clampedProgress}
              className="h-2 bg-muted/60"
              indicatorClassName={indicatorColor}
            />

            {/* Bottom Status Row */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-muted-foreground font-mono">
                {formatPercentage(percentage)}
              </span>

              {isOver ? (
                <span className="font-medium text-rose-600 dark:text-rose-400">
                  +{formatCurrency(Math.abs(remaining), defaultCurrency)} over
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {formatCurrency(remaining, defaultCurrency)} remaining
                </span>
              )}
            </div>
          </div>

          {foreignCount > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/40 rounded px-2 py-1">
              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
              <span>{foreignCount} foreign currency transaction(s) excluded</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Budget Dialog */}
      <EditBudgetDialog
        budget={budget}
        defaultCurrency={defaultCurrency}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* Delete Budget Confirmation Dialog */}
      <DeleteBudgetDialog
        budget={budget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
