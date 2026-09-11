import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  PieChart,
  Wallet,
  Landmark,
  PiggyBank,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Finora</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-medium">
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="gap-1.5 font-medium shadow-xs">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-36">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/50 px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-2xs backdrop-blur-xs mb-8">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Production-grade personal finance & wealth tracking</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
              One clear view of your{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                financial life.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Track accounts, categorize expenses, transfer funds seamlessly, and
              master monthly budgets with real-time analytics. Built for clarity and control.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-md gap-2">
                  Create Free Account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base font-medium">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Value Highlights */}
            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 text-left">
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 mb-4">
                  <Landmark className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">Multi-Account Ledger</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Manage bank accounts, credit cards, cash, and investments in one place with exact balance derivation.
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-4">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">Clean Account Transfers</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Transfers shift money between accounts without artificially inflating your monthly income or expense totals.
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 mb-4">
                  <PieChart className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">Monthly Budgeting</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Set category allowances and monitor live progress bars to keep spending disciplined and stress-free.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Finora. Personal Wealth Management Platform.</p>
          <div className="flex items-center gap-6">
            <span className="text-xs">Zero floating-point errors • Row Level Security • Strict TypeScript</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
