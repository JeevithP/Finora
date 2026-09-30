"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createBudgetSchema,
  updateBudgetSchema,
  budgetQuerySchema,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  type BudgetQueryInput,
} from "@/lib/validations/budget";
import { Budget, Category } from "@/types/database.types";

export type BudgetWithCategory = Budget & {
  category: Pick<Category, "id" | "name" | "icon" | "color" | "type" | "is_system">;
};

export interface BudgetActionResult {
  success: boolean;
  data?: BudgetWithCategory | Budget;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface BudgetListResult {
  success: boolean;
  data?: BudgetWithCategory[];
  error?: string;
}

const BUDGET_SELECT_QUERY = `
  *,
  category:categories(id, name, icon, color, type, is_system)
`;

/**
 * CREATE BUDGET
 * Allocates a monthly budget for an expense category.
 */
export async function createBudgetAction(
  input: CreateBudgetInput
): Promise<BudgetActionResult> {
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

  const result = createBudgetSchema.safeParse(input);
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
      error: result.error.issues[0]?.message || "Invalid budget details",
      fieldErrors,
    };
  }

  const { categoryId, amount, month, year } = result.data;

  // 1. Verify category exists, belongs to user or system, and is an 'expense' category
  const { data: category, error: catErr } = await supabase
    .from("categories")
    .select("id, name, type, icon, color, is_system, user_id")
    .eq("id", categoryId)
    .maybeSingle();

  if (catErr || !category || (!category.is_system && category.user_id !== user.id)) {
    return {
      success: false,
      error: "Category not found or access denied.",
    };
  }

  if (category.type !== "expense") {
    return {
      success: false,
      error: "Budgets can only be set for expense categories.",
    };
  }

  // 2. Check for duplicate budget for same category in the same month/year
  const { data: existingBudget } = await supabase
    .from("budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("category_id", categoryId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (existingBudget) {
    return {
      success: false,
      error: "A budget for this category already exists in the selected month.",
    };
  }

  // 3. Insert budget
  const { data, error } = await supabase
    .from("budgets")
    .insert({
      user_id: user.id,
      category_id: categoryId,
      amount,
      month,
      year,
    })
    .select(BUDGET_SELECT_QUERY)
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/budgets");
  revalidatePath("/dashboard");

  return {
    success: true,
    data: data as unknown as BudgetWithCategory,
  };
}

/**
 * UPDATE BUDGET
 * Modifies an existing budget amount.
 */
export async function updateBudgetAction(
  input: UpdateBudgetInput
): Promise<BudgetActionResult> {
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

  const result = updateBudgetSchema.safeParse(input);
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
      error: result.error.issues[0]?.message || "Invalid budget details",
      fieldErrors,
    };
  }

  const { id, amount } = result.data;

  // 1. Verify budget exists and belongs to current user
  const { data: existingBudget, error: fetchErr } = await supabase
    .from("budgets")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !existingBudget) {
    return {
      success: false,
      error: "Budget not found or access denied.",
    };
  }

  // 2. Update budget
  const { data, error } = await supabase
    .from("budgets")
    .update({
      amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(BUDGET_SELECT_QUERY)
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/budgets");
  revalidatePath("/dashboard");

  return {
    success: true,
    data: data as unknown as BudgetWithCategory,
  };
}

/**
 * DELETE BUDGET
 * Deletes a monthly budget allowance.
 */
export async function deleteBudgetAction(
  id: string
): Promise<BudgetActionResult> {
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

  // 1. Verify budget exists and belongs to current user
  const { data: existingBudget, error: fetchErr } = await supabase
    .from("budgets")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !existingBudget) {
    return {
      success: false,
      error: "Budget not found or access denied.",
    };
  }

  // 2. Delete budget
  const { data, error } = await supabase
    .from("budgets")
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

  revalidatePath("/budgets");
  revalidatePath("/dashboard");

  return {
    success: true,
    data: data as unknown as Budget,
  };
}

/**
 * GET BUDGETS ACTION
 * Retrieves user budgets for a specific month and year.
 */
export async function getBudgetsAction(
  filters?: BudgetQueryInput
): Promise<BudgetListResult> {
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

  const parseResult = budgetQuerySchema.safeParse(filters ?? {});
  const safeFilters = parseResult.success ? parseResult.data : {};

  let query = supabase
    .from("budgets")
    .select(BUDGET_SELECT_QUERY)
    .eq("user_id", user.id);

  if (safeFilters.month) {
    query = query.eq("month", safeFilters.month);
  }

  if (safeFilters.year) {
    query = query.eq("year", safeFilters.year);
  }

  query = query.order("created_at", { ascending: true });

  const { data, error } = await query;

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    data: (data || []) as unknown as BudgetWithCategory[],
  };
}
