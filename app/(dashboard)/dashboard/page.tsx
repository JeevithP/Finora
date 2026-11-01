import { redirect } from "next/navigation";
import { getAuthenticatedUser, getUserProfile } from "@/lib/auth/cached";
import { createClient } from "@/lib/supabase/server";
import { getAnalyticsData } from "@/lib/analytics/queries";
import { TRANSACTION_SELECT_QUERY } from "@/lib/constants";
import { Account } from "@/types/database.types";
import { TransactionWithRelations } from "@/actions/transactions";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Fetch profile to resolve reporting currency
  const profile = await getUserProfile(user.id);
  const defaultCurrency = profile?.default_currency || "INR";

  // Parallelize analytics, accounts, and recent transactions
  const [analyticsData, accountsResult, recentTxResult] =
    await Promise.all([
      getAnalyticsData(user.id, defaultCurrency, "this_month"),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("transactions")
        .select(TRANSACTION_SELECT_QUERY)
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const accounts = (accountsResult.data || []) as Account[];
  const recentTransactions = (recentTxResult.data ||
    []) as unknown as TransactionWithRelations[];

  // Authoritative existence of any transaction in ledger
  const hasTransactions = Boolean(
    analyticsData.hasTransactions || recentTransactions.length > 0
  );

  // Calculate Net Worth / Balance across active accounts in reporting currency
  const activeAccounts = accounts.filter((a) => !a.is_archived);
  const reportingAccounts = activeAccounts.filter(
    (a) => a.currency === defaultCurrency
  );
  const assetTypes = ["checking", "savings", "cash", "investment"];
  const liabilityTypes = ["credit_card", "loan"];

  const totalAssets = reportingAccounts
    .filter((a) => assetTypes.includes(a.type))
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  const totalLiabilities = reportingAccounts
    .filter((a) => liabilityTypes.includes(a.type))
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  const netWorth = totalAssets - totalLiabilities;

  const displayName =
    profile?.full_name?.trim() ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <DashboardView
      displayName={displayName}
      netWorth={netWorth}
      activeAccountsCount={activeAccounts.length}
      summary={analyticsData.summary}
      budgetVsActual={analyticsData.budgetVsActual}
      recentTransactions={recentTransactions}
      accounts={accounts}
      insights={analyticsData.insights || []}
      defaultCurrency={defaultCurrency}
      hasTransactions={hasTransactions}
    />
  );
}
