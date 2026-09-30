import { z } from "zod";

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid({ message: "Invalid category identifier" }),
  amount: z
    .number()
    .positive({ message: "Budget amount must be greater than 0" })
    .max(999999999999.99, { message: "Budget amount exceeds maximum limit" }),
  month: z
    .number()
    .int({ message: "Month must be an integer" })
    .min(1, { message: "Month must be between 1 and 12" })
    .max(12, { message: "Month must be between 1 and 12" }),
  year: z
    .number()
    .int({ message: "Year must be an integer" })
    .min(2020, { message: "Year must be 2020 or later" })
    .max(2100, { message: "Year cannot exceed 2100" }),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = z.object({
  id: z.string().uuid({ message: "Invalid budget identifier" }),
  amount: z
    .number()
    .positive({ message: "Budget amount must be greater than 0" })
    .max(999999999999.99, { message: "Budget amount exceeds maximum limit" }),
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

export const budgetQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
});

export type BudgetQueryInput = z.infer<typeof budgetQuerySchema>;
