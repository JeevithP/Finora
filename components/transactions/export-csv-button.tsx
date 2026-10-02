"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  exportFilteredTransactionsAction,
  type ExportTransactionsFilterInput,
} from "@/actions/transactions";

interface ExportCsvButtonProps {
  filters?: ExportTransactionsFilterInput;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportCsvButton({
  filters,
  className,
  variant = "outline",
  size = "default",
}: ExportCsvButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await exportFilteredTransactionsAction(filters);
      if (!res.success || !res.csvContent) {
        toast.error(res.error || "Failed to export transactions.");
        return;
      }

      // Create browser blob and trigger download without page reload
      const blob = new Blob([res.csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename || "finora-transactions.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (res.isCapped) {
        toast.warning(
          `Export downloaded, but capped at 5,000 records (${res.totalFound?.toLocaleString()} found).`
        );
      } else {
        toast.success(`Exported ${res.rowCount} transactions.`);
      }
    } catch (err: unknown) {
      console.error("Export error:", err);
      toast.error("An unexpected error occurred during export.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      <span>{loading ? "Exporting..." : "Export CSV"}</span>
    </Button>
  );
}
