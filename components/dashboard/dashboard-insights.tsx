"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { FinancialInsight, InsightSeverity } from "@/lib/insights/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DashboardInsightsProps {
  insights?: FinancialInsight[];
}

function getSeverityConfig(severity: InsightSeverity) {
  switch (severity) {
    case "warning":
      return {
        icon: AlertTriangle,
        badgeText: "Notice",
        badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
        containerClass: "border-amber-500/30 bg-amber-500/[0.03] hover:bg-amber-500/[0.06]",
        iconClass: "text-amber-600 dark:text-amber-400",
      };
    case "positive":
      return {
        icon: CheckCircle2,
        badgeText: "Surplus",
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        containerClass: "border-emerald-500/30 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]",
        iconClass: "text-emerald-600 dark:text-emerald-400",
      };
    case "info":
    default:
      return {
        icon: Info,
        badgeText: "Observation",
        badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30",
        containerClass: "border-sky-500/30 bg-sky-500/[0.03] hover:bg-sky-500/[0.06]",
        iconClass: "text-sky-600 dark:text-sky-400",
      };
  }
}

export function DashboardInsights({ insights = [] }: DashboardInsightsProps) {
  if (insights.length === 0) {
    return null;
  }

  // Display top 2-3 insights compactly
  const topInsights = insights.slice(0, 3);

  return (
    <Card className="border-border/80 bg-card shadow-2xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                Financial Insights
              </CardTitle>
              <CardDescription className="text-xs">
                Key patterns and observations detected from this month&apos;s ledger activity
              </CardDescription>
            </div>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <Link href="/analytics">
              <span>View all insights</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topInsights.map((insight) => {
            const config = getSeverityConfig(insight.severity);
            const Icon = config.icon;

            return (
              <div
                key={insight.id}
                data-testid={`dashboard-insight-${insight.type}`}
                className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all space-y-2.5 ${config.containerClass}`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 ${config.iconClass}`} />
                      <span className="font-semibold text-xs text-foreground tracking-tight truncate">
                        {insight.title}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase font-mono px-1.5 py-0 h-4 shrink-0 ${config.badgeClass}`}
                    >
                      {config.badgeText}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {insight.message}
                  </p>
                </div>

                {insight.action && (
                  <div className="pt-1 flex items-center justify-end">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[11px] font-medium text-foreground hover:text-primary gap-1 hover:bg-transparent"
                    >
                      <Link href={insight.action.href}>
                        <span>{insight.action.label}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
