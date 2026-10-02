"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { FinancialInsight, InsightSeverity } from "@/lib/insights/types";
import { INSIGHT_THRESHOLDS } from "@/lib/insights/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FinancialInsightsCardProps {
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

export function FinancialInsightsCard({
  insights = [],
}: FinancialInsightsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (insights.length === 0) {
    return null;
  }

  const maxDisplay = INSIGHT_THRESHOLDS.MAX_DISPLAYED_INSIGHTS;
  const hasMore = insights.length > maxDisplay;
  const displayedInsights = isExpanded
    ? insights
    : insights.slice(0, maxDisplay);

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
                Deterministic observations and patterns derived from your ledger activity
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0.5">
            {insights.length} {insights.length === 1 ? "Insight" : "Insights"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayedInsights.map((insight) => {
            const config = getSeverityConfig(insight.severity);
            const Icon = config.icon;

            return (
              <div
                key={insight.id}
                data-testid={`insight-item-${insight.type}`}
                className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all space-y-2.5 ${config.containerClass}`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 shrink-0 ${config.iconClass}`} />
                      <span className="font-semibold text-xs text-foreground tracking-tight">
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
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {insight.message}
                  </p>
                </div>

                {insight.action && (
                  <div className="pt-1 flex items-center justify-end">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-medium text-foreground hover:text-primary gap-1 hover:bg-transparent"
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

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="text-xs h-8 gap-1.5"
            >
              {isExpanded ? (
                <>
                  <span>Show Fewer Insights</span>
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span>View All ({insights.length}) Insights</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
