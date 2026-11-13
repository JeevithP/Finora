"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, Printer, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportFinancialReportAction } from "@/actions/reports";
import { AnalyticsPeriodKey } from "@/lib/analytics/types";

interface ExportReportButtonProps {
  periodKey: AnalyticsPeriodKey;
  customFrom?: string;
  customTo?: string;
  className?: string;
}

export function ExportReportButton({
  periodKey,
  customFrom,
  customTo,
  className,
}: ExportReportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExportCsv = async () => {
    setLoading(true);
    try {
      const res = await exportFinancialReportAction({
        periodKey,
        customFrom,
        customTo,
      });

      if (!res.success || !res.csvContent) {
        toast.error(res.error || "Failed to generate report.");
        return;
      }

      // Download CSV via temporary blob link
      const blob = new Blob([res.csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        res.filename || "finora-financial-report.csv"
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Financial report downloaded successfully.");
    } catch (err: unknown) {
      console.error("Export error:", err);
      toast.error("An unexpected error occurred while exporting report.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className={`h-8 px-3 text-xs font-medium gap-1.5 bg-card shadow-2xs hover:bg-accent ${className || ""}`}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
          )}
          <span>{loading ? "Generating..." : "Export Report"}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={handleExportCsv}
          disabled={loading}
          className="text-xs cursor-pointer gap-2"
        >
          <Download className="h-3.5 w-3.5 text-primary" />
          <div className="flex flex-col">
            <span className="font-medium">Download CSV Report</span>
            <span className="text-[10px] text-muted-foreground">
              Excel, Sheets & Numbers
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handlePrint}
          className="text-xs cursor-pointer gap-2"
        >
          <Printer className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium">Print / Save as PDF</span>
            <span className="text-[10px] text-muted-foreground">
              Clean printable statement
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
