import { redirect } from "next/navigation";
import { ShieldCheck, UserCheck, KeyRound, Database } from "lucide-react";
import { getAuthenticatedUser, getUserProfile } from "@/lib/auth/cached";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);

  const formattedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Just now";

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome, {profile?.full_name || user.email?.split("@")[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Finora Authentication & Session Verification Hub
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 gap-1.5 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Session Authenticated
          </Badge>
        </div>
      </div>

      {/* Verification Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* User Identity Card */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">User Identity</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <CardDescription className="text-xs">
              Supabase Auth user session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium text-foreground truncate">{user.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">User ID:</span>
              <p className="font-mono text-[11px] text-muted-foreground truncate">{user.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Database Profile Card */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Database Profile</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Database className="h-4 w-4" />
              </div>
            </div>
            <CardDescription className="text-xs">
              Synced via Postgres trigger
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">Full Name:</span>
              <p className="font-medium text-foreground">{profile?.full_name || "Not set"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Default Currency:</span>
              <p className="font-medium text-foreground">{profile?.default_currency || "INR"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Security & Token Info Card */}
        <Card className="shadow-xs sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Security & RLS</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                <KeyRound className="h-4 w-4" />
              </div>
            </div>
            <CardDescription className="text-xs">
              Row Level Security Active
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <span className="text-muted-foreground">Profile Created:</span>
              <p className="font-medium text-foreground">{formattedDate}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Proxy Protection:</span>
              <p className="font-medium text-emerald-600 font-mono text-[11px]">getClaims() Verified</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Status Banner */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-base font-semibold">
              Milestone 2 Verified: Authentication & Route Protection
            </CardTitle>
          </div>
          <CardDescription className="text-sm">
            You have successfully reached the protected application area. All sessions are secured with HTTP-only cookies, Next.js 16 proxy route interception, and PostgreSQL Row-Level Security policies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Upcoming in Milestone 3</span>
              <span className="font-mono">Accounts & Ledger Engine</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Multi-account creation (checking, savings, credit cards, loans), atomic transfer executions, sign-dependent transaction balances, and real-time ledger reconciliation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
