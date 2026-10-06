"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { CategoryExpenseItem } from "@/lib/analytics/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import {
  Tag,
  Home,
  ShoppingCart,
  Utensils,
  Car,
  Zap,
  Film,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  Sparkles,
  CircleEllipsis,
  Briefcase,
  Laptop,
  TrendingUp,
  Building,
  Gift,
  Coins,
} from "lucide-react";

export const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  Tag,
  Home,
  ShoppingCart,
  Utensils,
  Car,
  Zap,
  Film,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  Sparkles,
  CircleEllipsis,
  Briefcase,
  Laptop,
  TrendingUp,
  Building,
  Gift,
  Coins,
};

interface CategoryExpenseChartProps {
  categories: CategoryExpenseItem[];
  defaultCurrency: string;
}

function DynamicCategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const IconComponent = CATEGORY_ICON_MAP[name] || Tag;
  return <IconComponent className={className} />;
}

interface CustomPieTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: CategoryExpenseItem;
  }>;
  defaultCurrency: string;
}

function CustomPieTooltip({
  active,
  payload,
  defaultCurrency,
}: CustomPieTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-md text-xs space-y-1 min-w-[160px]">
      <div className="flex items-center gap-1.5 font-semibold text-foreground">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: item.categoryColor }}
        />
        <span>{item.categoryName}</span>
      </div>
      <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/60">
        <span>Spent:</span>
        <span className="font-semibold text-foreground font-mono">
          {formatCurrency(item.effectiveExpense, defaultCurrency)}
        </span>
      </div>
      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
        <span>Share:</span>
        <span className="font-medium text-foreground">
          {formatPercentage(item.percentageOfTotal)}
        </span>
      </div>
      {item.refunds > 0 && (
        <div className="flex items-center justify-between text-amber-600 text-[10px]">
          <span>Refunds:</span>
          <span>-{formatCurrency(item.refunds, defaultCurrency)}</span>
        </div>
      )}
    </div>
  );
}

export function CategoryExpenseChart({
  categories,
  defaultCurrency,
}: CategoryExpenseChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const activeCategories = categories.filter((c) => c.effectiveExpense > 0);
  const totalExpense = activeCategories.reduce(
    (acc, curr) => acc + curr.effectiveExpense,
    0
  );

  return (
    <Card className="border-border/80 bg-card shadow-2xs">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">
              Expense by Category
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of spending across all expense categories
            </CardDescription>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {formatCurrency(totalExpense, defaultCurrency)} Total
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {activeCategories.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-center p-4 text-muted-foreground text-xs space-y-1">
            <p>No category expenses recorded for this timeframe.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center min-w-0">
            {/* Donut Chart */}
            <div className="md:col-span-5 h-[220px] flex items-center justify-center relative min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={
                      <CustomPieTooltip defaultCurrency={defaultCurrency} />
                    }
                  />
                  <Pie
                    data={activeCategories}
                    dataKey="effectiveExpense"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    onMouseEnter={(data) => {
                      const item = data as unknown as { categoryName?: string };
                      setHoveredCategory(item?.categoryName || null);
                    }}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    {activeCategories.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.categoryColor || "#64748b"}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[11px] text-muted-foreground font-medium">
                  Categories
                </span>
                <span className="text-lg font-bold text-foreground">
                  {activeCategories.length}
                </span>
              </div>
            </div>

            {/* Ranked Category List */}
            <div className="md:col-span-7 space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {activeCategories.map((item) => {
                const isHovered = hoveredCategory === item.categoryName;
                return (
                  <div
                    key={item.categoryId || "uncategorized"}
                    onMouseEnter={() => setHoveredCategory(item.categoryName)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className={`p-2 rounded-xl transition-colors space-y-1.5 ${
                      isHovered ? "bg-accent/60" : "hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={{
                            backgroundColor: `${item.categoryColor}20`,
                            color: item.categoryColor,
                          }}
                        >
                          <DynamicCategoryIcon
                            name={item.categoryIcon}
                            className="h-3.5 w-3.5"
                          />
                        </div>
                        <span className="font-semibold text-foreground truncate">
                          {item.categoryName}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          ({item.txCount} tx)
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-semibold font-mono text-foreground">
                          {formatCurrency(item.effectiveExpense, defaultCurrency)}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1.5 font-medium">
                          {formatPercentage(item.percentageOfTotal)}
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={item.percentageOfTotal}
                      className="h-1.5 bg-muted"
                      style={
                        {
                          "--progress-background": item.categoryColor,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
