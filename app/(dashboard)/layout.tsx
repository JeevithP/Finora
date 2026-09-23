import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TrendingUp, User as UserIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as Profile | null;

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";
  const currency = profile?.default_currency || "INR";

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 font-semibold transition-opacity hover:opacity-90"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Finora
              </span>
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/accounts"
                className="rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Accounts
              </Link>
              <span className="rounded-lg px-3 py-1.5 text-muted-foreground/60 cursor-not-allowed">
                Transactions
              </span>
              <span className="rounded-lg px-3 py-1.5 text-muted-foreground/60 cursor-not-allowed">
                Budgets
              </span>
              <span className="rounded-lg px-3 py-1.5 text-muted-foreground/60 cursor-not-allowed">
                Analytics
              </span>
            </nav>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs shadow-2xs">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserIcon className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-foreground leading-none">
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {user.email}
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0 h-4">
                {currency}
              </Badge>
            </div>

            <LogoutButton variant="outline" size="sm" />
          </div>
        </div>
      </header>

      {/* Main App Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
