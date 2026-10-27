"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
  normalizeTransactionInput,
  loanRepaymentSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type TransactionQueryInput,
  type LoanRepaymentInput,
} from "@/lib/validations/transaction";
import { Transaction, Account, Category, TransactionType } from "@/types/database.types";
import { TRANSACTION_SELECT_QUERY } from "@/lib/constants";

export type TransactionWithRelations = Transaction & {
  account?: Pick<Account, "id" | "name" | "type" | "currency" | "color" | "icon"> | null;
  destination_account?: Pick<Account, "id" | "name" | "type" | "currency" | "color" | "icon"> | null;
  category?: Pick<Category, "id" | "name" | "type" | "icon" | "color" | "is_system"> | null;
};

export interface TransactionActionResult {
  success: boolean;
  data?: TransactionWithRelations;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface TransactionListResult {
  success: boolean;
  data?: TransactionWithRelations[];
  error?: string;
  count?: number;
}

/**
 * CREATE TRANSACTION
 * Inserts transaction into the ledger.
 * PostgreSQL trigger trg_sync_account_balance atomically updates account balance(s).
 */
export async function createTransactionAction(
  input: CreateTransactionInput
): Promise<TransactionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please log in.",
    };
  }

  const result = createTransactionSchema.safeParse(
    normalizeTransactionInput(input)
  );
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return {
      success: false,
      error: result.error.issues[0]?.message || "Invalid transaction details",
      fieldErrors,
    };
  }

  const {
    type,
    amount,
    date,
    description,
    notes,
    accountId,
    destinationAccountId,
    categoryId,
    originalTransactionId,
    adjustmentType,
  } = result.data;

  // 1-4. Parallelize independent validation queries (source account, destination account, category, original transaction)
  const [sourceAccResult, destAccResult, catResult, origTxResult] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, user_id")
        .eq("id", accountId)
        .eq("user_id", user.id)
        .maybeSingle(),
      destinationAccountId
        ? supabase
            .from("accounts")
            .select("id, user_id")
            .eq("id", destinationAccountId)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      categoryId
        ? supabase
            .from("categories")
            .select("id, user_id, is_system")
            .eq("id", categoryId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      originalTransactionId
        ? supabase
            .from("transactions")
            .select("id, user_id")
            .eq("id", originalTransactionId)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  // 1. Verify source account ownership
  if (sourceAccResult.error || !sourceAccResult.data) {
    return {
      success: false,
      error: "Source account not found or access denied.",
    };
  }

  // 2. If transfer, verify destination account ownership
  if (destinationAccountId && (destAccResult.error || !destAccResult.data)) {
    return {
      success: false,
      error: "Destination account not found or access denied.",
    };
  }

  // 3. If categoryId provided, verify ownership or system category
  if (categoryId) {
    const cat = catResult.data;
    if (catResult.error || !cat || (!cat.is_system && cat.user_id !== user.id)) {
      return {
        success: false,
        error: "Category not found or access denied.",
      };
    }
  }

  // 4. If originalTransactionId provided, verify user ownership
  if (originalTransactionId && (origTxResult.error || !origTxResult.data)) {
    return {
      success: false,
      error: "Original transaction not found or access denied.",
    };
  }

  // 5. Insert transaction into ledger (PostgreSQL trigger automatically adjusts balances)
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: accountId,
      destination_account_id: destinationAccountId ?? null,
      category_id: categoryId ?? null,
      original_transaction_id: originalTransactionId ?? null,
      type,
      adjustment_type: adjustmentType ?? null,
      amount,
      date,
      description,
      notes: notes ?? null,
    })
    .select(TRANSACTION_SELECT_QUERY)
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");

  return {
    success: true,
    data: data as unknown as TransactionWithRelations,
  };
}

/**
 * READ / QUERY TRANSACTIONS
 * Retrieves user transactions with account & category relations, respecting RLS.
 */
export async function getTransactionsAction(
  filters?: TransactionQueryInput
): Promise<TransactionListResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please log in.",
    };
  }

  const parseResult = transactionQuerySchema.safeParse(filters ?? {});
  const safeFilters = parseResult.success ? parseResult.data : { limit: 50, offset: 0 };

  let query = supabase
    .from("transactions")
    .select(TRANSACTION_SELECT_QUERY)
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (safeFilters.accountId) {
    query = query.or(
      `account_id.eq.${safeFilters.accountId},destination_account_id.eq.${safeFilters.accountId}`
    );
  }

  if (safeFilters.categoryId) {
    query = query.eq("category_id", safeFilters.categoryId);
  }

  if (safeFilters.type) {
    query = query.eq("type", safeFilters.type);
  }

  if (safeFilters.startDate) {
    query = query.gte("date", safeFilters.startDate);
  }

  if (safeFilters.endDate) {
    query = query.lte("date", safeFilters.endDate);
  }

  const limit = safeFilters.limit ?? 50;
  const offset = safeFilters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    data: (data || []) as unknown as TransactionWithRelations[],
    count: count ?? undefined,
  };
}

/**
 * READ SINGLE TRANSACTION
 */
export async function getTransactionByIdAction(
  id: string
): Promise<TransactionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please log in.",
    };
  }

  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_SELECT_QUERY)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      error: "Transaction not found or access denied.",
    };
  }

  return {
    success: true,
    data: data as unknown as TransactionWithRelations,
  };
}

/**
 * UPDATE TRANSACTION
 * Modifies an existing transaction.
 * PostgreSQL trigger trg_sync_account_balance atomically reverses OLD and applies NEW balance effects.
 */
export async function updateTransactionAction(
  input: UpdateTransactionInput
): Promise<TransactionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please log in.",
    };
  }

  const result = updateTransactionSchema.safeParse(
    normalizeTransactionInput(input)
  );
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return {
      success: false,
      error: result.error.issues[0]?.message || "Invalid transaction update details",
      fieldErrors,
    };
  }

  const {
    id,
    type,
    amount,
    date,
    description,
    notes,
    accountId,
    destinationAccountId,
    categoryId,
    originalTransactionId,
    adjustmentType,
  } = result.data;

  // 1. Verify transaction exists and belongs to current user
  const { data: existingTx, error: fetchErr } = await supabase
    .from("transactions")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !existingTx) {
    return {
      success: false,
      error: "Transaction not found or access denied.",
    };
  }

  // 2. Verify source account ownership
  const { data: sourceAcc, error: sourceErr } = await supabase
    .from("accounts")
    .select("id, user_id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sourceErr || !sourceAcc) {
    return {
      success: false,
      error: "Source account not found or access denied.",
    };
  }

  // 3. If transfer, verify destination account ownership
  if (destinationAccountId) {
    const { data: destAcc, error: destErr } = await supabase
      .from("accounts")
      .select("id, user_id")
      .eq("id", destinationAccountId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (destErr || !destAcc) {
      return {
        success: false,
        error: "Destination account not found or access denied.",
      };
    }
  }

  // 4. If categoryId provided, verify ownership or system category
  if (categoryId) {
    const { data: cat, error: catErr } = await supabase
      .from("categories")
      .select("id, user_id, is_system")
      .eq("id", categoryId)
      .maybeSingle();

    if (catErr || !cat || (!cat.is_system && cat.user_id !== user.id)) {
      return {
        success: false,
        error: "Category not found or access denied.",
      };
    }
  }

  // 5. If originalTransactionId provided, verify user ownership
  if (originalTransactionId) {
    const { data: origTx, error: origErr } = await supabase
      .from("transactions")
      .select("id, user_id")
      .eq("id", originalTransactionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (origErr || !origTx) {
      return {
        success: false,
        error: "Original transaction not found or access denied.",
      };
    }
  }

  // 6. Update transaction in ledger (PostgreSQL trigger automatically reverses OLD and applies NEW)
  const { data, error } = await supabase
    .from("transactions")
    .update({
      account_id: accountId,
      destination_account_id: destinationAccountId ?? null,
      category_id: categoryId ?? null,
      original_transaction_id: originalTransactionId ?? null,
      type,
      adjustment_type: adjustmentType ?? null,
      amount,
      date,
      description,
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(TRANSACTION_SELECT_QUERY)
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");

  return {
    success: true,
    data: data as unknown as TransactionWithRelations,
  };
}

/**
 * DELETE TRANSACTION
 * Removes transaction from ledger.
 * PostgreSQL trigger trg_sync_account_balance automatically reverses balance effect(s).
 */
export async function deleteTransactionAction(
  id: string
): Promise<TransactionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please log in.",
    };
  }

  // Verify transaction exists and belongs to current user
  const { data: existingTx, error: fetchErr } = await supabase
    .from("transactions")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !existingTx) {
    return {
      success: false,
      error: "Transaction not found or access denied.",
    };
  }

  // Delete transaction (PostgreSQL trigger automatically reverses OLD balance effects)
  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");

  return {
    success: true,
    data: data as unknown as TransactionWithRelations,
  };
}

export interface ExportTransactionsFilterInput {
  searchQuery?: string;
  selectedAccount?: string;
  selectedType?: string;
  selectedCategory?: string;
}

export interface ExportTransactionsResult {
  success: boolean;
  csvContent?: string;
  filename?: string;
  rowCount?: number;
  isCapped?: boolean;
  totalFound?: number;
  error?: string;
}

const CSV_FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

function escapeCsvField(val: unknown, isTextField = false): string {
  if (val === null || val === undefined) return "";
  let str = String(val);

  // Neutralize spreadsheet formula injection on user-controlled text fields (CWE-1236)
  if (isTextField && str.length > 0) {
    const firstChar = str.charAt(0);
    if (CSV_FORMULA_TRIGGERS.includes(firstChar)) {
      str = `'${str}`;
    }
  }

  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * EXPORT FILTERED TRANSACTIONS TO CSV
 * Queries the authoritative ledger matching active UI filters up to 5,000 records.
 * Generates RFC 4180 compliant CSV text with UTF-8 BOM.
 */
export async function exportFilteredTransactionsAction(
  filters?: ExportTransactionsFilterInput
): Promise<ExportTransactionsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please log in.",
    };
  }

  const {
    searchQuery = "",
    selectedAccount = "all",
    selectedType = "all",
    selectedCategory = "all",
  } = filters || {};

  // Build query enforcing RLS via user_id
  let query = supabase
    .from("transactions")
    .select(
      "id, type, amount, date, description, notes, created_at, account_id, destination_account_id, category_id, account:accounts!transactions_account_id_fkey(id, name, currency), destination_account:accounts!transactions_destination_account_id_fkey(id, name, currency), category:categories(id, name)"
    )
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  // Apply Account Filter
  if (selectedAccount && selectedAccount !== "all") {
    query = query.or(
      `account_id.eq.${selectedAccount},destination_account_id.eq.${selectedAccount}`
    );
  }

  // Apply Type Filter
  if (
    selectedType &&
    selectedType !== "all" &&
    [
      "income",
      "expense",
      "transfer",
      "refund",
      "loan_repayment",
      "adjustment",
    ].includes(selectedType)
  ) {
    query = query.eq("type", selectedType as NonNullable<TransactionType>);
  }

  // Apply Category Filter
  if (selectedCategory && selectedCategory !== "all") {
    query = query.eq("category_id", selectedCategory);
  }

  // Fetch up to 5,001 rows to detect if capped
  query = query.limit(5001);

  const { data, error } = await query;

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  type RawExportTx = {
    id: string;
    type: string;
    amount: number;
    date: string;
    description: string | null;
    notes: string | null;
    created_at: string;
    account_id: string;
    destination_account_id: string | null;
    category_id: string | null;
    account?: { id: string; name: string; currency: string } | null;
    destination_account?: { id: string; name: string; currency: string } | null;
    category?: { id: string; name: string } | null;
  };

  let rows = (data || []) as unknown as RawExportTx[];

  // Apply search query filter matching client search semantics
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    rows = rows.filter((tx) => {
      const descMatch = (tx.description || "").toLowerCase().includes(q);
      const notesMatch = (tx.notes || "").toLowerCase().includes(q);
      const accMatch = (tx.account?.name || "").toLowerCase().includes(q);
      const destMatch = (tx.destination_account?.name || "").toLowerCase().includes(q);
      const catMatch = (tx.category?.name || "").toLowerCase().includes(q);
      return descMatch || notesMatch || accMatch || destMatch || catMatch;
    });
  }

  const totalFound = rows.length;
  const isCapped = totalFound > 5000;
  if (isCapped) {
    rows = rows.slice(0, 5000);
  }

  // CSV Headers
  const headers = [
    "Date",
    "Transaction ID",
    "Type",
    "Description",
    "Amount",
    "Currency",
    "Account",
    "Destination Account",
    "Category",
    "Notes",
    "Created At",
  ];

  const csvLines: string[] = [headers.join(",")];

  rows.forEach((tx) => {
    const date = tx.date || "";
    const id = tx.id;
    const type = tx.type;
    const description = tx.description || "";
    const amount = Number(tx.amount || 0).toFixed(2);
    const currency = tx.account?.currency || "INR";
    const accountName = tx.account?.name || "";
    const destAccountName =
      tx.type === "transfer" ? tx.destination_account?.name || "" : "";
    const categoryName =
      tx.type === "transfer" ? "Transfer" : tx.category?.name || "";
    const notes = tx.notes || "";
    const createdAt = tx.created_at;

    const line = [
      escapeCsvField(date, false),
      escapeCsvField(id, false),
      escapeCsvField(type, false),
      escapeCsvField(description, true),
      escapeCsvField(amount, false),
      escapeCsvField(currency, false),
      escapeCsvField(accountName, true),
      escapeCsvField(destAccountName, true),
      escapeCsvField(categoryName, true),
      escapeCsvField(notes, true),
      escapeCsvField(createdAt, false),
    ].join(",");

    csvLines.push(line);
  });

  // Prepend UTF-8 BOM for Microsoft Excel / spreadsheet compatibility
  const csvContent = "\uFEFF" + csvLines.join("\r\n");
  const todayStr = new Date().toISOString().split("T")[0];
  const filename = `finora-transactions-${todayStr}.csv`;

  return {
    success: true,
    csvContent,
    filename,
    rowCount: rows.length,
    isCapped,
    totalFound,
  };
}

/**
 * CREATE LOAN REPAYMENT
 * Dedicated action to record loan principal repayments from an asset account
 * to a loan liability account, with optional atomic interest/fee expense tracking.
 */
export async function createLoanRepaymentAction(
  input: LoanRepaymentInput
): Promise<TransactionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized. Please log in.",
    };
  }

  const result = loanRepaymentSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return {
      success: false,
      error: result.error.issues[0]?.message || "Invalid loan repayment details",
      fieldErrors,
    };
  }

  const {
    payingAccountId,
    loanAccountId,
    principalAmount,
    interestAmount,
    interestCategoryId,
    date,
    description,
    notes,
  } = result.data;

  // Parallelize paying account, loan account, and optional interest category verification
  const [payingAccResult, loanAccResult, intCatResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type, currency, user_id")
      .eq("id", payingAccountId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("id, name, type, currency, user_id")
      .eq("id", loanAccountId)
      .eq("user_id", user.id)
      .maybeSingle(),
    interestAmount && interestAmount > 0 && interestCategoryId
      ? supabase
          .from("categories")
          .select("id, type, user_id, is_system")
          .eq("id", interestCategoryId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  // 1. Verify paying account (must be asset account owned by user)
  const { data: payingAcc, error: payingErr } = payingAccResult;
  if (payingErr || !payingAcc) {
    return {
      success: false,
      error: "Paying account not found or access denied.",
    };
  }

  const assetTypes = ["checking", "savings", "cash", "investment"];
  if (!assetTypes.includes(payingAcc.type)) {
    return {
      success: false,
      error: "Paying account must be an asset account (checking, savings, cash, or investment).",
    };
  }

  // 2. Verify loan account (must be liability account owned by user)
  const { data: loanAcc, error: loanErr } = loanAccResult;
  if (loanErr || !loanAcc) {
    return {
      success: false,
      error: "Loan account not found or access denied.",
    };
  }

  if (loanAcc.type !== "loan" && loanAcc.type !== "credit_card") {
    return {
      success: false,
      error: "Target account must be a liability account (loan or credit card).",
    };
  }

  // 3. If interest specified, verify category is valid expense category
  if (interestAmount && interestAmount > 0) {
    if (!interestCategoryId) {
      return {
        success: false,
        error: "Category is required for interest expense.",
      };
    }
    const { data: intCat, error: intCatErr } = intCatResult;

    if (intCatErr || !intCat || (!intCat.is_system && intCat.user_id !== user.id)) {
      return {
        success: false,
        error: "Interest expense category not found or access denied.",
      };
    }

    if (intCat.type !== "expense") {
      return {
        success: false,
        error: "Interest category must be an expense category.",
      };
    }
  }

  const repaymentDesc =
    description?.trim() || `Loan Repayment: ${loanAcc.name}`;
  const txDate = date.split("T")[0];

  // 4. Execute repayment atomically via fn_record_loan_repayment RPC if available, or sequential with rollback
  let repaymentTxId: string | null = null;
  const rpcResponse = await supabase.rpc("fn_record_loan_repayment", {
    p_paying_account_id: payingAccountId,
    p_loan_account_id: loanAccountId,
    p_principal_amount: principalAmount,
    p_date: txDate,
    p_description: repaymentDesc,
    p_notes: notes || null,
    p_interest_amount: interestAmount && interestAmount > 0 ? interestAmount : null,
    p_interest_category_id: interestCategoryId || null,
  });

  if (!rpcResponse.error && rpcResponse.data) {
    const rpcData = rpcResponse.data as { repaymentTransactionId: string };
    repaymentTxId = rpcData.repaymentTransactionId;
  } else if (rpcResponse.error?.code === "PGRST202") {
    // Fallback strictly when RPC function is not installed/found in database
    const { data: repTx, error: repErr } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        account_id: payingAccountId,
        destination_account_id: loanAccountId,
        category_id: null,
        type: "loan_repayment",
        amount: principalAmount,
        date: txDate,
        description: repaymentDesc,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (repErr || !repTx) {
      return {
        success: false,
        error: repErr?.message || "Failed to record loan repayment transaction.",
      };
    }

    repaymentTxId = repTx.id;

    if (interestAmount && interestAmount > 0 && interestCategoryId) {
      const { error: intErr } = await supabase.from("transactions").insert({
        user_id: user.id,
        account_id: payingAccountId,
        destination_account_id: null,
        category_id: interestCategoryId,
        type: "expense",
        amount: interestAmount,
        date: txDate,
        description: `Loan Interest: ${loanAcc.name}`,
        notes: notes ? `Interest portion: ${notes}` : "Interest portion of loan payment",
      });

      if (intErr) {
        // Rollback principal transaction to preserve atomicity
        const { error: rollbackErr } = await supabase
          .from("transactions")
          .delete()
          .eq("id", repaymentTxId);

        if (rollbackErr) {
          console.error(
            "CRITICAL: Failed to rollback principal transaction after interest failure:",
            rollbackErr
          );
        }

        return {
          success: false,
          error: `Failed to record interest expense: ${intErr.message}.${
            rollbackErr ? " WARNING: Rollback of principal transaction failed." : ""
          }`,
        };
      }
    }
  } else {
    // Return actual database RPC error directly without attempting separate inserts
    return {
      success: false,
      error:
        rpcResponse.error?.message ||
        "Failed to record loan repayment via database RPC.",
    };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");

  return {
    success: true,
  };
}
