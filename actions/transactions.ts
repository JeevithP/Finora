"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
  normalizeTransactionInput,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type TransactionQueryInput,
} from "@/lib/validations/transaction";
import { Transaction, Account, Category } from "@/types/database.types";
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
  } = result.data;

  // 1. Verify source account ownership
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

  // 2. If transfer, verify destination account ownership
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

  // 3. If categoryId provided, verify ownership or system category
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

  // 4. If originalTransactionId provided, verify user ownership
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
