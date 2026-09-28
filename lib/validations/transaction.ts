import { z } from "zod";

export const transactionTypeSchema = z.enum([
  "income",
  "expense",
  "transfer",
  "refund",
]);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

/**
 * Base Zod validation rules for transactions
 */
export const baseTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z
    .number({ message: "Amount must be a number" })
    .positive({ message: "Amount must be greater than 0" })
    .max(999999999999.99, { message: "Amount exceeds maximum limit" }),
  date: z
    .string()
    .trim()
    .min(1, { message: "Date is required" })
    .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, {
      message: "Invalid date format (YYYY-MM-DD expected)",
    }),
  description: z
    .string()
    .trim()
    .min(1, { message: "Description is required" })
    .max(255, { message: "Description cannot exceed 255 characters" }),
  notes: z
    .string()
    .max(1000, { message: "Notes cannot exceed 1000 characters" })
    .nullable()
    .optional(),
  accountId: z.string().uuid({ message: "Invalid account identifier" }),
  destinationAccountId: z
    .string()
    .uuid({ message: "Invalid destination account identifier" })
    .nullable()
    .optional(),
  categoryId: z
    .string()
    .uuid({ message: "Invalid category identifier" })
    .nullable()
    .optional(),
  originalTransactionId: z
    .string()
    .uuid({ message: "Invalid original transaction identifier" })
    .nullable()
    .optional(),
});

/**
 * Helper to normalize snake_case keys if provided
 */
export function normalizeTransactionInput(val: unknown) {
  if (typeof val !== "object" || val === null) return val;
  const obj = val as Record<string, unknown>;
  return {
    ...obj,
    accountId: obj.accountId ?? obj.account_id,
    destinationAccountId: obj.destinationAccountId ?? obj.destination_account_id,
    categoryId: obj.categoryId ?? obj.category_id,
    originalTransactionId:
      obj.originalTransactionId ?? obj.original_transaction_id,
  };
}

/**
 * Zod schema for creating a transaction
 */
export const createTransactionSchema = baseTransactionSchema.superRefine(
  (data, ctx) => {
    if (data.type === "income" || data.type === "expense") {
      if (!data.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Category is required for ${data.type} transactions`,
          path: ["categoryId"],
        });
      }
      if (data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Destination account must be null for ${data.type} transactions`,
          path: ["destinationAccountId"],
        });
      }
    } else if (data.type === "transfer") {
      if (!data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination account is required for transfers",
          path: ["destinationAccountId"],
        });
      } else if (data.destinationAccountId === data.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Source and destination accounts must be different",
          path: ["destinationAccountId"],
        });
      }
      if (data.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Category must be null for transfers",
          path: ["categoryId"],
        });
      }
    } else if (data.type === "refund") {
      if (data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination account must be null for refund transactions",
          path: ["destinationAccountId"],
        });
      }
    }
  }
);

export type CreateTransactionInput = z.infer<typeof baseTransactionSchema>;

/**
 * Zod schema for updating a transaction
 */
export const updateTransactionSchema = baseTransactionSchema
  .extend({
    id: z.string().uuid({ message: "Invalid transaction identifier" }),
  })
  .superRefine((data, ctx) => {
    if (data.type === "income" || data.type === "expense") {
      if (!data.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Category is required for ${data.type} transactions`,
          path: ["categoryId"],
        });
      }
      if (data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Destination account must be null for ${data.type} transactions`,
          path: ["destinationAccountId"],
        });
      }
    } else if (data.type === "transfer") {
      if (!data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination account is required for transfers",
          path: ["destinationAccountId"],
        });
      } else if (data.destinationAccountId === data.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Source and destination accounts must be different",
          path: ["destinationAccountId"],
        });
      }
      if (data.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Category must be null for transfers",
          path: ["categoryId"],
        });
      }
    } else if (data.type === "refund") {
      if (data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination account must be null for refund transactions",
          path: ["destinationAccountId"],
        });
      }
    }
  });

export type UpdateTransactionInput = z.infer<typeof baseTransactionSchema> & {
  id: string;
};

/**
 * Zod schema for query/filter options
 */
export const transactionQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: transactionTypeSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;
