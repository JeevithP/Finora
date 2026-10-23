import { z } from "zod";

export const transactionTypeSchema = z.enum([
  "income",
  "expense",
  "transfer",
  "refund",
  "adjustment",
  "loan_repayment",
]);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const adjustmentTypeSchema = z.enum(["increase", "decrease"]);
export type AdjustmentType = z.infer<typeof adjustmentTypeSchema>;

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
  adjustmentType: adjustmentTypeSchema.nullable().optional(),
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
    adjustmentType: obj.adjustmentType ?? obj.adjustment_type,
  };
}

function refineTransaction(
  data: z.infer<typeof baseTransactionSchema>,
  ctx: z.RefinementCtx
) {
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
    if (data.adjustmentType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Adjustment type must be null for ${data.type} transactions`,
        path: ["adjustmentType"],
      });
    }
  } else if (data.type === "transfer" || data.type === "loan_repayment") {
    if (!data.destinationAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Destination account is required for ${data.type === "loan_repayment" ? "loan repayments" : "transfers"}`,
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
        message: `Category must be null for ${data.type === "loan_repayment" ? "loan repayments" : "transfers"}`,
        path: ["categoryId"],
      });
    }
    if (data.adjustmentType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Adjustment type must be null for ${data.type === "loan_repayment" ? "loan repayments" : "transfers"}`,
        path: ["adjustmentType"],
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
    if (data.adjustmentType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Adjustment type must be null for refund transactions",
        path: ["adjustmentType"],
      });
    }
  } else if (data.type === "adjustment") {
    if (!data.adjustmentType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Adjustment type (increase or decrease) is required for balance adjustments",
        path: ["adjustmentType"],
      });
    }
    if (data.destinationAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Destination account must be null for balance adjustments",
        path: ["destinationAccountId"],
      });
    }
    if (data.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Category must be null for balance adjustments",
        path: ["categoryId"],
      });
    }
  }
}

/**
 * Zod schema for creating a transaction
 */
export const createTransactionSchema = baseTransactionSchema.superRefine(refineTransaction);

export type CreateTransactionInput = z.infer<typeof baseTransactionSchema>;

/**
 * Zod schema for updating a transaction
 */
export const updateTransactionSchema = baseTransactionSchema
  .extend({
    id: z.string().uuid({ message: "Invalid transaction identifier" }),
  })
  .superRefine(refineTransaction);

export type UpdateTransactionInput = z.infer<typeof baseTransactionSchema> & {
  id: string;
};

/**
 * Zod schema for loan repayment workflow
 */
export const loanRepaymentSchema = z
  .object({
    payingAccountId: z.string().uuid({ message: "Paying account is required" }),
    loanAccountId: z.string().uuid({ message: "Loan account is required" }),
    principalAmount: z
      .number({ message: "Principal amount must be a number" })
      .positive({ message: "Principal amount must be greater than 0" })
      .max(999999999999.99, { message: "Amount exceeds maximum limit" }),
    interestAmount: z
      .number({ message: "Interest amount must be a number" })
      .min(0, { message: "Interest amount cannot be negative" })
      .max(999999999999.99, { message: "Amount exceeds maximum limit" })
      .optional()
      .default(0),
    interestCategoryId: z
      .string()
      .uuid({ message: "Category is required for interest expense" })
      .nullable()
      .optional(),
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
      .max(255, { message: "Description cannot exceed 255 characters" })
      .optional()
      .default(""),
    notes: z
      .string()
      .max(1000, { message: "Notes cannot exceed 1000 characters" })
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.payingAccountId === data.loanAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paying account and loan account must be different",
        path: ["loanAccountId"],
      });
    }
    if (data.interestAmount && data.interestAmount > 0 && !data.interestCategoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select an expense category for the interest/fee portion",
        path: ["interestCategoryId"],
      });
    }
  });

export type LoanRepaymentInput = z.input<typeof loanRepaymentSchema>;

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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Zod schema for URL search parameters on the /transactions page
 */
export const transactionSearchParamsSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  account: z
    .string()
    .trim()
    .refine((val) => val === "all" || UUID_REGEX.test(val), {
      message: "Invalid account identifier",
    })
    .optional()
    .default("all"),
  category: z
    .string()
    .trim()
    .refine(
      (val) => val === "all" || val === "uncategorized" || UUID_REGEX.test(val),
      {
        message: "Invalid category identifier",
      }
    )
    .optional()
    .default("all"),
  type: z
    .enum(["all", "income", "expense", "transfer", "refund", "adjustment", "loan_repayment"])
    .optional()
    .default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((val) => [10, 25, 50, 100].includes(val), {
      message: "Invalid page size",
    })
    .optional()
    .default(25),
});

export type TransactionSearchParams = z.infer<
  typeof transactionSearchParamsSchema
>;

export function parseTransactionSearchParams(
  rawParams: Record<string, string | string[] | undefined>
): TransactionSearchParams {
  const getSingle = (val: string | string[] | undefined) =>
    Array.isArray(val) ? val[0] : val;

  const candidate = {
    q: getSingle(rawParams.q),
    account: getSingle(rawParams.account),
    category: getSingle(rawParams.category),
    type: getSingle(rawParams.type),
    page: getSingle(rawParams.page),
    pageSize: getSingle(rawParams.pageSize),
  };

  const parsed = transactionSearchParamsSchema.safeParse(candidate);
  if (parsed.success) {
    return parsed.data;
  }

  // Gracefully fallback to safe defaults if invalid input is provided
  const rawAcc = typeof candidate.account === "string" ? candidate.account.trim() : "all";
  const safeAccount = rawAcc !== "all" && UUID_REGEX.test(rawAcc) ? rawAcc : "all";

  const rawCat = typeof candidate.category === "string" ? candidate.category.trim() : "all";
  const safeCategory =
    rawCat === "uncategorized" || (rawCat !== "all" && UUID_REGEX.test(rawCat))
      ? rawCat
      : "all";

  const validTypes = ["income", "expense", "transfer", "refund", "adjustment", "loan_repayment"];

  return {
    q: typeof candidate.q === "string" ? candidate.q.slice(0, 100).trim() : "",
    account: safeAccount,
    category: safeCategory,
    type: validTypes.includes(candidate.type as string)
      ? (candidate.type as TransactionType)
      : "all",
    page: Math.max(1, parseInt(String(candidate.page), 10) || 1),
    pageSize: [10, 25, 50, 100].includes(parseInt(String(candidate.pageSize), 10))
      ? parseInt(String(candidate.pageSize), 10)
      : 25,
  };
}
