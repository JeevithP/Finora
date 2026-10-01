"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { MonthlyTrendPoint } from "@/lib/analytics/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency, formatCurrency } from "@/lib/formatters";

interface MonthlyTrendChartProps {
  data: MonthlyTrendPoint[];
  defaultCurrency: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: MonthlyTrendPoint;
  }>;
  label?: string;
  defaultCurrency: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  defaultCurrency,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl border border-border bg-card/95 p-3.5 shadow-lg backdrop-blur-md text-xs space-y-1.5 min-w-[180px]">
      <p className="font-bold text-foreground text-sm border-b border-border/60 pb-1">
        {label}
      </p>
      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
        <span>Income:</span>
        <span className="font-semibold font-mono">
          {formatCurrency(point.income, defaultCurrency)}
        </span>
      </div>
      <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
        <span>Expense:</span>
        <span className="font-semibold font-mono">
          {formatCurrency(point.effectiveExpense, defaultCurrency)}
        </span>
      </div>
      {point.refunds > 0 && (
        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-[11px]">
          <span>(Refunds):</span>
          <span className="font-mono">
            -{formatCurrency(point.refunds, defaultCurrency)}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-border/60 font-medium">
        <span className="text-muted-foreground">Net Cash Flow:</span>
        <span
          className={`font-semibold font-mono ${
            point.netCashFlow >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {formatCurrency(point.netCashFlow, defaultCurrency)}
        </span>
      </div>
    </div>
  );
}

export function MonthlyTrendChart({
  data,
  defaultCurrency,
}: MonthlyTrendChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    name: item.label,
  }));

  const allZero = data.every(
    (d) => d.income === 0 && d.effectiveExpense === 0
  );

  return (
    <Card className="border-border/80 bg-card shadow-2xs">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">
              Income vs. Expense Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Monthly cash flow trajectory across the selected timeframe
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {allZero ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-center p-4 text-muted-foreground text-xs space-y-1">
            <p>No income or expense entries recorded in this timeframe.</p>
          </div>
        ) : (
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-border/40"
                />
                <XAxis
                  dataKey="label"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) =>
                    formatCompactCurrency(val, defaultCurrency)
                  }
                />
                <Tooltip
                  content={<CustomTooltip defaultCurrency={defaultCurrency} />}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "0px" }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="effectiveExpense"
                  name="Expense"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
