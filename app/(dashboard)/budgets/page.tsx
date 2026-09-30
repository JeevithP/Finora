import React from "react";
import { redirect } from "next/navigation";

import { getAuthenticatedUser, getUserProfile } from "@/lib/auth/cached";
import { createClient } from "@/lib/supabase/server";
import { BudgetWithCategory } from "@/actions/budgets";
import { Category } from "@/types/database.types";
import { BudgetGrid, CategorySpendData } from "@/components/budgets/budget-grid";

export const dynamic = "force-dynamic";

interface BudgetsPageProps {
  searchParams?: Promise<{
    month?: string;
    year?: string;
  }>;
}

type RawBudgetTx = {
  category_id: string | null;
  type: string;
  amount: number;
  account?: { currency?: string } | null;
};

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const month = resolvedParams.month
    ? Math.min(12, Math.max(1, parseInt(resolvedParams.month, 10) || currentMonth))
    : currentMonth;

  const year = resolvedParams.year
    ? Math.max(2020, parseInt(resolvedParams.year, 10) || currentYear)
    : currentYear;

  const supabase = await createClient();

  // Calculate calendar month date boundaries
  const startDay = "01";
  const startDate = `${year}-${String(month).padStart(2, "0")}-${startDay}`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Parallel data fetching: profile, budgets for period, expense categories, transactions in month
  const [profile, budgetsResult, categoriesResult, transactionsResult] =
    await Promise.all([
      getUserProfile(user.id),
      supabase
        .from("budgets")
        .select("*, category:categories(id, name, icon, color, type, is_system)")
        .eq("user_id", user.id)
        .eq("month", month)
        .eq("year", year)
        .order("created_at", { ascending: true }),
      supabase
        .from("categories")
        .select("*")
        .eq("type", "expense")
        .or(`user_id.eq.${user.id},is_system.eq.true`)
        .order("name", { ascending: true }),
      supabase
        .from("transactions")
        .select("category_id, type, amount, account:accounts!transactions_account_id_fkey(currency)")
        .eq("user_id", user.id)
        .in("type", ["expense", "refund"])
        .gte("date", startDate)
        .lte("date", endDate),
    ]);

  const defaultCurrency = profile?.default_currency || "INR";
  const budgets = (budgetsResult.data || []) as unknown as BudgetWithCategory[];
  const categories = (categoriesResult.data || []) as Category[];
  const transactions = (transactionsResult.data || []) as unknown as RawBudgetTx[];

  // Calculate category spending with M4 safe multi-currency and M6 refund net spend rules
  const spendMap: Record<string, CategorySpendData> = {};

  transactions.forEach((tx) => {
    if (!tx.category_id) return;

    if (!spendMap[tx.category_id]) {
      spendMap[tx.category_id] = {
        baseSpent: 0,
        rawNetSpent: 0,
        foreignCount: 0,
      };
    }

    const txCurrency = tx.account?.currency || defaultCurrency;
    const isBaseCurrency = txCurrency.toUpperCase() === defaultCurrency.toUpperCase();

    if (isBaseCurrency) {
      const delta = tx.type === "refund" ? -Number(tx.amount) : Number(tx.amount);
      spendMap[tx.category_id].rawNetSpent += delta;
    } else {
      spendMap[tx.category_id].foreignCount += 1;
    }
  });

  // Apply UI floor at zero for negative net spend (e.g. refunds > expenses)
  Object.keys(spendMap).forEach((catId) => {
    const raw = spendMap[catId].rawNetSpent;
    spendMap[catId].baseSpent = Math.max(0, raw);
  });

  return (
    <BudgetGrid
      budgets={budgets}
      categories={categories}
      spendMap={spendMap}
      month={month}
      year={year}
      defaultCurrency={defaultCurrency}
    />
  );
}
