"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransactionPaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  isPending?: boolean;
}

export function TransactionPagination({
  currentPage,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  isPending = false,
}: TransactionPaginationProps) {
  if (totalCount === 0) {
    return null;
  }

  const fromRecord = Math.min((currentPage - 1) * pageSize + 1, totalCount);
  const toRecord = Math.min(currentPage * pageSize, totalCount);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("ellipsis");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2 pb-1">
      {/* Left: Summary text & loading indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          Showing{" "}
          <span className="font-semibold text-foreground">
            {fromRecord.toLocaleString()}–{toRecord.toLocaleString()}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">
            {totalCount.toLocaleString()}
          </span>{" "}
          transactions
        </span>
        {isPending && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-1" />
        )}
      </div>

      {/* Right: Controls (Page Size Selector & Page Navigation) */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
        {/* Page Size Selector */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(parseInt(val, 10))}
            disabled={isPending}
          >
            <SelectTrigger className="h-8 w-[72px] text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Page Navigation (< md) */}
        <div className="flex items-center gap-1 md:hidden">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-xs"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="px-2 text-xs font-medium text-foreground">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-xs"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Desktop Page Navigation (md and up) */}
        <div className="hidden md:flex items-center gap-1">
          {/* First page button */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-xs"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1 || isPending}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page button */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-xs"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          {pageNumbers.map((page, idx) => {
            if (page === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-xs text-muted-foreground select-none"
                >
                  …
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <Button
                key={page}
                variant={isActive ? "secondary" : "ghost"}
                size="icon"
                className={`h-8 w-8 text-xs font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onPageChange(page)}
                disabled={isPending}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Page ${page}`}
              >
                {page}
              </Button>
            );
          })}

          {/* Next page button */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-xs"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page button */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-xs"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages || isPending}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
