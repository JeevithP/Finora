import React from "react";
import Link from "next/link";
import { TrendingUp, ShieldCheck } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="w-full max-w-md text-center mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <TrendingUp className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Finora
          </span>
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
          Intelligent personal finance & wealth management
        </p>
      </div>

      {/* Main Auth Card Container */}
      <div className="w-full max-w-md">{children}</div>

      {/* Security & Trust Footer */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>Bank-grade encryption • Row-level PostgreSQL security</span>
      </div>
    </div>
  );
}
