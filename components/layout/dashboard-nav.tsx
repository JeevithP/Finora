"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  PiggyBank,
  LineChart,
  Menu,
  X,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardNavProps {
  userEmail?: string | null;
  displayName?: string;
  defaultCurrency?: string;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/analytics", label: "Analytics", icon: LineChart },
];

export function DashboardNav({
  userEmail,
  displayName,
  defaultCurrency = "INR",
}: DashboardNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isRouteActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Handle click outside and Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    if (mobileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className="flex items-center gap-2" ref={menuRef}>
      {/* Desktop Navigation */}
      <nav
        className="hidden md:flex items-center gap-1 text-sm font-medium"
        aria-label="Main Navigation"
      >
        {NAV_ITEMS.map((item) => {
          const active = isRouteActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all text-sm ${
                active
                  ? "bg-primary/10 text-primary font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile Navigation Menu Toggle */}
      <div className="md:hidden relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="h-9 w-9 p-0 rounded-lg border-border/80 text-foreground"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Mobile Dropdown Menu Panel */}
        {mobileOpen && (
          <div
            role="menu"
            aria-label="Mobile Navigation"
            className="absolute left-0 top-full mt-2 w-60 rounded-xl border border-border bg-popover/95 backdrop-blur-md p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95"
          >
            {/* Mobile User Profile Info */}
            {userEmail && (
              <div className="p-2 border-b border-border/60 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {displayName || "User"}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {userEmail}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="ml-auto text-[9px] uppercase font-mono px-1 py-0 h-4 shrink-0"
                  >
                    {defaultCurrency}
                  </Badge>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const active = isRouteActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
