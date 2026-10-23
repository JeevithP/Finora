-- ==============================================================================
-- FINORA — DATABASE MIGRATION
-- Migration Version: 20261024000000_ledger_loan_and_adjustment.sql
-- Description: Enhances financial ledger engine with:
--              1. 'loan_repayment' and 'adjustment' transaction types.
--              2. 'adjustment_type' column ('increase', 'decrease').
--              3. Updated constraints on destination accounts and adjustments.
--              4. Updated fn_adjust_account_balance & fn_sync_account_balance.
--              5. Updated v_account_balances reconciliation view.
--              6. Updated fn_get_analytics_data RPC to exclude adjustments and
--                 principal repayments from income/expense metrics.
--              7. Created atomic fn_record_loan_repayment RPC.
-- ==============================================================================

-- 1. ADD ADJUSTMENT_TYPE COLUMN
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS adjustment_type VARCHAR(10);

-- 2. UPDATE TRANSACTION TYPE CHECK CONSTRAINT
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.transactions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type%'
      AND conname NOT LIKE '%destination%'
      AND conname NOT LIKE '%adjustment%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.transactions DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income', 'expense', 'transfer', 'refund', 'adjustment', 'loan_repayment'));

-- 3. UPDATE TRANSFERS & REPAYMENTS DESTINATION CONSTRAINT
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS chk_transfers_destination;
ALTER TABLE public.transactions
  ADD CONSTRAINT chk_transfers_destination CHECK (
    (type IN ('transfer', 'loan_repayment') AND destination_account_id IS NOT NULL AND destination_account_id != account_id AND category_id IS NULL)
    OR
    (type NOT IN ('transfer', 'loan_repayment') AND destination_account_id IS NULL)
  );

-- 4. ADD ADJUSTMENT TYPE CONSTRAINT
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS chk_adjustment_type;
ALTER TABLE public.transactions
  ADD CONSTRAINT chk_adjustment_type CHECK (
    (type = 'adjustment' AND adjustment_type IN ('increase', 'decrease') AND category_id IS NULL)
    OR
    (type != 'adjustment' AND adjustment_type IS NULL)
  );

-- 5. UPDATE BALANCE ADJUSTMENT HELPER FUNCTION
-- Drop legacy 5-argument overload to ensure unambiguous function resolution
DROP FUNCTION IF EXISTS public.fn_adjust_account_balance(UUID, VARCHAR, NUMERIC, BOOLEAN, INTEGER);

CREATE OR REPLACE FUNCTION public.fn_adjust_account_balance(
  p_account_id UUID,
  p_tx_type VARCHAR,
  p_amount NUMERIC,
  p_is_destination BOOLEAN,
  p_multiplier INTEGER,
  p_adjustment_type VARCHAR DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_acc_type VARCHAR;
  v_delta NUMERIC := 0;
BEGIN
  IF p_account_id IS NULL THEN
    RETURN;
  END IF;

  SELECT type INTO v_acc_type FROM public.accounts WHERE id = p_account_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_acc_type IN ('checking', 'savings', 'cash', 'investment') THEN
    -- ASSET ACCOUNTS: current_balance represents assets owned (>0)
    IF p_tx_type = 'income' THEN
      v_delta := p_amount * p_multiplier;
    ELSIF p_tx_type = 'expense' THEN
      v_delta := -p_amount * p_multiplier;
    ELSIF p_tx_type = 'refund' THEN
      v_delta := p_amount * p_multiplier;
    ELSIF p_tx_type IN ('transfer', 'loan_repayment') THEN
      IF p_is_destination THEN
        v_delta := p_amount * p_multiplier;  -- Incoming transfer increases asset balance
      ELSE
        v_delta := -p_amount * p_multiplier; -- Outgoing transfer or loan repayment decreases asset balance
      END IF;
    ELSIF p_tx_type = 'adjustment' THEN
      IF p_adjustment_type = 'increase' THEN
        v_delta := p_amount * p_multiplier;  -- Balance increase
      ELSE
        v_delta := -p_amount * p_multiplier; -- Balance decrease
      END IF;
    END IF;

  ELSIF v_acc_type IN ('credit_card', 'loan') THEN
    -- LIABILITY ACCOUNTS: current_balance represents debt owed (>0)
    IF p_tx_type = 'expense' THEN
      v_delta := p_amount * p_multiplier;  -- Purchase/interest increases debt
    ELSIF p_tx_type = 'refund' THEN
      v_delta := -p_amount * p_multiplier; -- Refund decreases debt
    ELSIF p_tx_type = 'income' THEN
      v_delta := -p_amount * p_multiplier; -- Direct income/credit reduces debt
    ELSIF p_tx_type IN ('transfer', 'loan_repayment') THEN
      IF p_is_destination THEN
        v_delta := -p_amount * p_multiplier; -- Paying bill or loan reduces debt
      ELSE
        v_delta := p_amount * p_multiplier;  -- Cash advance / borrowing increases debt
      END IF;
    ELSIF p_tx_type = 'adjustment' THEN
      IF p_adjustment_type = 'increase' THEN
        v_delta := p_amount * p_multiplier;  -- Debt increase
      ELSE
        v_delta := -p_amount * p_multiplier; -- Debt decrease
      END IF;
    END IF;
  END IF;

  UPDATE public.accounts
  SET current_balance = current_balance + v_delta,
      updated_at = now()
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. UPDATE MAIN BALANCE SYNC TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.fn_sync_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.fn_adjust_account_balance(NEW.account_id, NEW.type, NEW.amount, false, 1, NEW.adjustment_type);
    IF NEW.type IN ('transfer', 'loan_repayment') AND NEW.destination_account_id IS NOT NULL THEN
      PERFORM public.fn_adjust_account_balance(NEW.destination_account_id, NEW.type, NEW.amount, true, 1, NEW.adjustment_type);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- 1. Reverse OLD transaction effects
    PERFORM public.fn_adjust_account_balance(OLD.account_id, OLD.type, OLD.amount, false, -1, OLD.adjustment_type);
    IF OLD.type IN ('transfer', 'loan_repayment') AND OLD.destination_account_id IS NOT NULL THEN
      PERFORM public.fn_adjust_account_balance(OLD.destination_account_id, OLD.type, OLD.amount, true, -1, OLD.adjustment_type);
    END IF;

    -- 2. Apply NEW transaction effects
    PERFORM public.fn_adjust_account_balance(NEW.account_id, NEW.type, NEW.amount, false, 1, NEW.adjustment_type);
    IF NEW.type IN ('transfer', 'loan_repayment') AND NEW.destination_account_id IS NOT NULL THEN
      PERFORM public.fn_adjust_account_balance(NEW.destination_account_id, NEW.type, NEW.amount, true, 1, NEW.adjustment_type);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.fn_adjust_account_balance(OLD.account_id, OLD.type, OLD.amount, false, -1, OLD.adjustment_type);
    IF OLD.type IN ('transfer', 'loan_repayment') AND OLD.destination_account_id IS NOT NULL THEN
      PERFORM public.fn_adjust_account_balance(OLD.destination_account_id, OLD.type, OLD.amount, true, -1, OLD.adjustment_type);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_sync_account_balance ON public.transactions;
CREATE TRIGGER trg_sync_account_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_account_balance();

-- 7. UPDATE RECONCILIATION VIEW
CREATE OR REPLACE VIEW public.v_account_balances WITH (security_invoker = true) AS
WITH transaction_deltas AS (
  SELECT
    t.account_id AS account_id,
    SUM(
      CASE
        -- Assets: income & refund add, expense & transfer/repayment subtract, adjustment increase adds, adjustment decrease subtracts
        WHEN a.type IN ('checking', 'savings', 'cash', 'investment') THEN
          CASE
            WHEN t.type IN ('income', 'refund') THEN t.amount
            WHEN t.type IN ('expense', 'transfer', 'loan_repayment') THEN -t.amount
            WHEN t.type = 'adjustment' AND t.adjustment_type = 'increase' THEN t.amount
            WHEN t.type = 'adjustment' AND t.adjustment_type = 'decrease' THEN -t.amount
            ELSE 0
          END
        -- Liabilities: expense & transfer-out add debt, refund & income subtract debt, adjustment increase adds debt, adjustment decrease subtracts debt
        WHEN a.type IN ('credit_card', 'loan') THEN
          CASE
            WHEN t.type IN ('expense', 'transfer') THEN t.amount
            WHEN t.type IN ('refund', 'income') THEN -t.amount
            WHEN t.type = 'adjustment' AND t.adjustment_type = 'increase' THEN t.amount
            WHEN t.type = 'adjustment' AND t.adjustment_type = 'decrease' THEN -t.amount
            ELSE 0
          END
        ELSE 0
      END
    ) AS source_delta
  FROM public.accounts a
  LEFT JOIN public.transactions t ON t.account_id = a.id
  GROUP BY t.account_id, a.type
),
transfer_destination_deltas AS (
  SELECT
    t.destination_account_id AS account_id,
    SUM(
      CASE
        -- Assets: receiving transfer increases balance
        WHEN a.type IN ('checking', 'savings', 'cash', 'investment') THEN t.amount
        -- Liabilities: receiving transfer or loan repayment decreases debt
        WHEN a.type IN ('credit_card', 'loan') THEN -t.amount
        ELSE 0
      END
    ) AS dest_delta
  FROM public.accounts a
  LEFT JOIN public.transactions t ON t.destination_account_id = a.id
  WHERE t.type IN ('transfer', 'loan_repayment')
  GROUP BY t.destination_account_id, a.type
)
SELECT
  a.id AS account_id,
  a.user_id,
  a.name AS account_name,
  a.type AS account_type,
  a.initial_balance,
  a.current_balance AS stored_balance,
  (
    a.initial_balance +
    COALESCE(td.source_delta, 0) +
    COALESCE(tdd.dest_delta, 0)
  ) AS calculated_balance,
  (
    a.current_balance = (
      a.initial_balance +
      COALESCE(td.source_delta, 0) +
      COALESCE(tdd.dest_delta, 0)
    )
  ) AS is_reconciled
FROM public.accounts a
LEFT JOIN transaction_deltas td ON td.account_id = a.id
LEFT JOIN transfer_destination_deltas tdd ON tdd.account_id = a.id;

-- 8. UPDATE ANALYTICS AGGREGATION RPC
CREATE OR REPLACE FUNCTION public.fn_get_analytics_data(
  p_start_date DATE,
  p_end_date_exclusive DATE,
  p_prev_start_date DATE,
  p_prev_end_date_exclusive DATE,
  p_default_currency VARCHAR(10) DEFAULT 'INR',
  p_months JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: valid Supabase user session required';
  END IF;

  WITH
  month_series AS (
    SELECT
      (elem->>'year')::INT AS year,
      (elem->>'month')::INT AS month,
      (elem->>'key')::TEXT AS key,
      (elem->>'label')::TEXT AS label,
      ord::INT AS sort_order
    FROM jsonb_array_elements(p_months) WITH ORDINALITY AS arr(elem, ord)
  ),

  -- Raw transactions filtered by user and date
  raw_tx AS (
    SELECT
      t.id,
      t.type,
      t.amount::NUMERIC(14, 2) AS amount,
      t.date,
      t.category_id,
      UPPER(COALESCE(a.currency, p_default_currency)) AS currency,
      (UPPER(COALESCE(a.currency, p_default_currency)) = UPPER(p_default_currency)) AS is_base_currency,
      (t.date >= p_start_date AND t.date < p_end_date_exclusive) AS is_current,
      (t.date >= p_prev_start_date AND t.date < p_prev_end_date_exclusive) AS is_prev,
      to_char(t.date, 'YYYY-MM') AS month_key
    FROM public.transactions t
    JOIN public.accounts a ON t.account_id = a.id
    WHERE t.user_id = v_user_id
      AND t.date >= LEAST(p_start_date, p_prev_start_date)
      AND t.date < GREATEST(p_end_date_exclusive, p_prev_end_date_exclusive)
  ),

  foreign_currencies_agg AS (
    SELECT
      COALESCE(jsonb_object_agg(currency, cnt), '{}'::jsonb) AS currencies_map
    FROM (
      SELECT currency, COUNT(*)::INT AS cnt
      FROM raw_tx
      WHERE is_current AND NOT is_base_currency AND type IN ('income', 'expense', 'refund')
      GROUP BY currency
    ) f
  ),

  prev_foreign_currencies_agg AS (
    SELECT
      COALESCE(jsonb_object_agg(currency, cnt), '{}'::jsonb) AS currencies_map
    FROM (
      SELECT currency, COUNT(*)::INT AS cnt
      FROM raw_tx
      WHERE is_prev AND NOT is_base_currency AND type IN ('income', 'expense', 'refund')
      GROUP BY currency
    ) pf
  ),

  current_aggregates AS (
    SELECT
      COALESCE(SUM(CASE WHEN is_current AND is_base_currency AND type = 'income' THEN amount ELSE 0 END), 0)::NUMERIC(14, 2) AS total_income,
      COALESCE(SUM(CASE WHEN is_current AND is_base_currency AND type = 'expense' THEN amount ELSE 0 END), 0)::NUMERIC(14, 2) AS gross_expense,
      COALESCE(SUM(CASE WHEN is_current AND is_base_currency AND type = 'refund' THEN amount ELSE 0 END), 0)::NUMERIC(14, 2) AS total_refunds,
      COALESCE(SUM(CASE WHEN is_current AND is_base_currency AND type IN ('income', 'expense', 'refund') THEN 1 ELSE 0 END), 0)::INT AS tx_count,
      COALESCE(SUM(CASE WHEN is_current AND NOT is_base_currency AND type IN ('income', 'expense', 'refund') THEN 1 ELSE 0 END), 0)::INT AS foreign_tx_count
    FROM raw_tx
  ),

  previous_aggregates AS (
    SELECT
      COALESCE(SUM(CASE WHEN is_prev AND is_base_currency AND type = 'income' THEN amount ELSE 0 END), 0)::NUMERIC(14, 2) AS total_income,
      COALESCE(SUM(CASE WHEN is_prev AND is_base_currency AND type = 'expense' THEN amount ELSE 0 END), 0)::NUMERIC(14, 2) AS gross_expense,
      COALESCE(SUM(CASE WHEN is_prev AND is_base_currency AND type = 'refund' THEN amount ELSE 0 END), 0)::NUMERIC(14, 2) AS total_refunds,
      COALESCE(SUM(CASE WHEN is_prev AND is_base_currency AND type IN ('income', 'expense', 'refund') THEN 1 ELSE 0 END), 0)::INT AS tx_count,
      COALESCE(SUM(CASE WHEN is_prev AND NOT is_base_currency AND type IN ('income', 'expense', 'refund') THEN 1 ELSE 0 END), 0)::INT AS foreign_tx_count
    FROM raw_tx
  ),

  monthly_grouped AS (
    SELECT
      month_key,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::NUMERIC(14, 2) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::NUMERIC(14, 2) AS gross_expense,
      COALESCE(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END), 0)::NUMERIC(14, 2) AS refunds
    FROM raw_tx
    WHERE is_current AND is_base_currency AND type IN ('income', 'expense', 'refund')
    GROUP BY month_key
  ),

  monthly_trend_rows AS (
    SELECT
      m.year,
      m.month,
      m.key,
      m.label,
      COALESCE(mg.income, 0.00)::NUMERIC(14, 2) AS income,
      COALESCE(mg.gross_expense, 0.00)::NUMERIC(14, 2) AS gross_expense,
      COALESCE(mg.refunds, 0.00)::NUMERIC(14, 2) AS refunds,
      (COALESCE(mg.gross_expense, 0.00) - COALESCE(mg.refunds, 0.00))::NUMERIC(14, 2) AS raw_net_expense,
      GREATEST(0.00, (COALESCE(mg.gross_expense, 0.00) - COALESCE(mg.refunds, 0.00)))::NUMERIC(14, 2) AS effective_expense,
      (COALESCE(mg.income, 0.00) - GREATEST(0.00, (COALESCE(mg.gross_expense, 0.00) - COALESCE(mg.refunds, 0.00))))::NUMERIC(14, 2) AS net_cash_flow
    FROM month_series m
    LEFT JOIN monthly_grouped mg ON mg.month_key = m.key
    ORDER BY m.sort_order ASC
  ),

  category_raw_spend AS (
    SELECT
      t.category_id,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)::NUMERIC(14, 2) AS gross_expense,
      COALESCE(SUM(CASE WHEN t.type = 'refund' THEN t.amount ELSE 0 END), 0)::NUMERIC(14, 2) AS refunds,
      COUNT(*)::INT AS tx_count
    FROM raw_tx t
    WHERE t.is_current AND t.is_base_currency AND t.type IN ('expense', 'refund')
    GROUP BY t.category_id
    HAVING (
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) > 0
      OR COALESCE(SUM(CASE WHEN t.type = 'refund' THEN t.amount ELSE 0 END), 0) > 0
    )
  ),

  category_rows_prepared AS (
    SELECT
      crs.category_id,
      CASE
        WHEN crs.category_id IS NULL THEN 'Uncategorized'
        ELSE COALESCE(c.name, 'Other Expense')
      END AS category_name,
      CASE
        WHEN crs.category_id IS NULL THEN 'Tag'
        ELSE COALESCE(c.icon, 'Tag')
      END AS category_icon,
      CASE
        WHEN crs.category_id IS NULL THEN '#64748b'
        ELSE COALESCE(c.color, '#64748b')
      END AS category_color,
      CASE
        WHEN crs.category_id IS NULL THEN false
        ELSE COALESCE(c.is_system, false)
      END AS is_system,
      crs.gross_expense,
      crs.refunds,
      (crs.gross_expense - crs.refunds)::NUMERIC(14, 2) AS raw_net_expense,
      GREATEST(0.00, (crs.gross_expense - crs.refunds))::NUMERIC(14, 2) AS effective_expense,
      crs.tx_count
    FROM category_raw_spend crs
    LEFT JOIN public.categories c ON c.id = crs.category_id
  ),

  category_total_effective AS (
    SELECT COALESCE(SUM(effective_expense), 0.00)::NUMERIC(14, 2) AS total_effective
    FROM category_rows_prepared
  ),

  category_breakdown_rows AS (
    SELECT
      crp.category_id,
      crp.category_name,
      crp.category_icon,
      crp.category_color,
      crp.is_system,
      crp.gross_expense,
      crp.refunds,
      crp.raw_net_expense,
      crp.effective_expense,
      CASE
        WHEN cte.total_effective > 0 THEN
          ROUND(((crp.effective_expense / cte.total_effective) * 100.0)::NUMERIC, 4)
        ELSE 0.0000
      END::NUMERIC(14, 4) AS percentage_of_total,
      crp.tx_count
    FROM category_rows_prepared crp
    CROSS JOIN category_total_effective cte
    ORDER BY crp.effective_expense DESC, crp.category_name ASC
  ),

  budget_sums AS (
    SELECT
      b.category_id,
      SUM(b.amount)::NUMERIC(14, 2) AS budgeted_amount,
      COALESCE(c.name, 'Expense') AS category_name,
      COALESCE(c.icon, 'Tag') AS category_icon,
      COALESCE(c.color, '#64748b') AS category_color
    FROM public.budgets b
    JOIN month_series m ON m.year = b.year AND m.month = b.month
    LEFT JOIN public.categories c ON c.id = b.category_id
    WHERE b.user_id = v_user_id
    GROUP BY b.category_id, c.name, c.icon, c.color
  ),

  budget_vs_actual_rows AS (
    SELECT
      bs.category_id,
      bs.category_name,
      bs.category_icon,
      bs.category_color,
      bs.budgeted_amount,
      COALESCE(crp.effective_expense, 0.00)::NUMERIC(14, 2) AS actual_spent,
      COALESCE(crp.raw_net_spent, 0.00)::NUMERIC(14, 2) AS raw_net_spent,
      (bs.budgeted_amount - COALESCE(crp.effective_expense, 0.00))::NUMERIC(14, 2) AS variance,
      CASE
        WHEN bs.budgeted_amount > 0 THEN
          ROUND(((COALESCE(crp.effective_expense, 0.00) / bs.budgeted_amount) * 100.0)::NUMERIC, 4)
        ELSE 0.0000
      END::NUMERIC(14, 4) AS percentage_spent,
      (COALESCE(crp.effective_expense, 0.00) > bs.budgeted_amount) AS is_over_budget,
      true AS has_budget
    FROM budget_sums bs
    LEFT JOIN category_rows_prepared crp ON crp.category_id = bs.category_id
    ORDER BY
      CASE
        WHEN bs.budgeted_amount > 0 THEN (COALESCE(crp.effective_expense, 0.00) / bs.budgeted_amount)
        ELSE 0
      END DESC,
      bs.category_name ASC
  ),

  unbudgeted_spending_rows AS (
    SELECT
      cbr.category_id,
      cbr.category_name,
      cbr.category_icon,
      cbr.category_color,
      cbr.is_system,
      cbr.gross_expense,
      cbr.refunds,
      cbr.raw_net_expense,
      cbr.effective_expense,
      cbr.percentage_of_total,
      cbr.tx_count
    FROM category_breakdown_rows cbr
    WHERE cbr.category_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM budget_sums bs WHERE bs.category_id = cbr.category_id
      )
    ORDER BY cbr.effective_expense DESC, cbr.category_name ASC
  )

  SELECT jsonb_build_object(
    'summary', (
      SELECT jsonb_build_object(
        'totalIncome', ca.total_income,
        'grossExpense', ca.gross_expense,
        'totalRefunds', ca.total_refunds,
        'rawNetExpense', (ca.gross_expense - ca.total_refunds)::NUMERIC(14, 2),
        'effectiveExpense', GREATEST(0.00, (ca.gross_expense - ca.total_refunds))::NUMERIC(14, 2),
        'netCashFlow', (ca.total_income - GREATEST(0.00, (ca.gross_expense - ca.total_refunds)))::NUMERIC(14, 2),
        'savingsRate', (
          CASE
            WHEN ca.total_income > 0 THEN
              ROUND((((ca.total_income - GREATEST(0.00, (ca.gross_expense - ca.total_refunds))) / ca.total_income) * 100.0)::NUMERIC, 4)
            ELSE 0.0000
          END
        )::NUMERIC(14, 4),
        'txCount', ca.tx_count,
        'foreignTxCount', ca.foreign_tx_count,
        'foreignCurrencies', (SELECT currencies_map FROM foreign_currencies_agg)
      ) FROM current_aggregates ca
    ),
    'previousPeriodSummary', (
      SELECT jsonb_build_object(
        'totalIncome', pa.total_income,
        'grossExpense', pa.gross_expense,
        'totalRefunds', pa.total_refunds,
        'rawNetExpense', (pa.gross_expense - pa.total_refunds)::NUMERIC(14, 2),
        'effectiveExpense', GREATEST(0.00, (pa.gross_expense - pa.total_refunds))::NUMERIC(14, 2),
        'netCashFlow', (pa.total_income - GREATEST(0.00, (pa.gross_expense - pa.total_refunds)))::NUMERIC(14, 2),
        'savingsRate', (
          CASE
            WHEN pa.total_income > 0 THEN
              ROUND((((pa.total_income - GREATEST(0.00, (pa.gross_expense - pa.total_refunds))) / pa.total_income) * 100.0)::NUMERIC, 4)
            ELSE 0.0000
          END
        )::NUMERIC(14, 4),
        'txCount', pa.tx_count,
        'foreignTxCount', pa.foreign_tx_count,
        'foreignCurrencies', (SELECT currencies_map FROM prev_foreign_currencies_agg)
      ) FROM previous_aggregates pa
    ),
    'monthlyTrend', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'year', mtr.year,
          'month', mtr.month,
          'key', mtr.key,
          'label', mtr.label,
          'income', mtr.income,
          'grossExpense', mtr.gross_expense,
          'refunds', mtr.refunds,
          'rawNetExpense', mtr.raw_net_expense,
          'effectiveExpense', mtr.effective_expense,
          'netCashFlow', mtr.net_cash_flow
        )
      ), '[]'::jsonb) FROM monthly_trend_rows mtr
    ),
    'categoryBreakdown', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'categoryId', cbr.category_id,
          'categoryName', cbr.category_name,
          'categoryIcon', cbr.category_icon,
          'categoryColor', cbr.category_color,
          'isSystem', cbr.is_system,
          'grossExpense', cbr.gross_expense,
          'refunds', cbr.refunds,
          'rawNetExpense', cbr.raw_net_expense,
          'effectiveExpense', cbr.effective_expense,
          'percentageOfTotal', cbr.percentage_of_total,
          'txCount', cbr.tx_count
        )
      ), '[]'::jsonb) FROM category_breakdown_rows cbr
    ),
    'budgetVsActual', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'categoryId', bvr.category_id,
          'categoryName', bvr.category_name,
          'categoryIcon', bvr.category_icon,
          'categoryColor', bvr.category_color,
          'budgetedAmount', bvr.budgeted_amount,
          'actualSpent', bvr.actual_spent,
          'rawNetSpent', bvr.raw_net_spent,
          'variance', bvr.variance,
          'percentageSpent', bvr.percentage_spent,
          'isOverBudget', bvr.is_over_budget,
          'hasBudget', bvr.has_budget
        )
      ), '[]'::jsonb) FROM budget_vs_actual_rows bvr
    ),
    'unbudgetedSpending', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'categoryId', usr.category_id,
          'categoryName', usr.category_name,
          'categoryIcon', usr.category_icon,
          'categoryColor', usr.category_color,
          'isSystem', usr.is_system,
          'grossExpense', usr.gross_expense,
          'refunds', usr.refunds,
          'rawNetExpense', usr.raw_net_expense,
          'effectiveExpense', usr.effective_expense,
          'percentageOfTotal', usr.percentage_of_total,
          'txCount', usr.tx_count
        )
      ), '[]'::jsonb) FROM unbudgeted_spending_rows usr
    ),
    'hasTransactions', (
      (SELECT (tx_count + foreign_tx_count) > 0 FROM current_aggregates)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_analytics_data TO authenticated;

-- 9. ATOMIC LOAN REPAYMENT RPC
CREATE OR REPLACE FUNCTION public.fn_record_loan_repayment(
  p_paying_account_id UUID,
  p_loan_account_id UUID,
  p_principal_amount NUMERIC,
  p_date DATE,
  p_description VARCHAR,
  p_notes TEXT DEFAULT NULL,
  p_interest_amount NUMERIC DEFAULT NULL,
  p_interest_category_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_paying_acc RECORD;
  v_loan_acc RECORD;
  v_interest_cat RECORD;
  v_repayment_tx_id UUID;
  v_interest_tx_id UUID := NULL;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: valid user session required';
  END IF;

  IF p_paying_account_id IS NULL OR p_loan_account_id IS NULL THEN
    RAISE EXCEPTION 'Paying account and loan account identifiers are required';
  END IF;

  IF p_date IS NULL THEN
    RAISE EXCEPTION 'Transaction date is required';
  END IF;

  IF p_principal_amount IS NULL OR p_principal_amount <= 0 THEN
    RAISE EXCEPTION 'Principal amount must be greater than zero';
  END IF;

  IF p_paying_account_id = p_loan_account_id THEN
    RAISE EXCEPTION 'Paying account and loan account cannot be the same';
  END IF;

  -- Verify paying account is owned by user and is an asset type
  SELECT id, user_id, type, currency INTO v_paying_acc
  FROM public.accounts
  WHERE id = p_paying_account_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paying account not found or access denied';
  END IF;

  IF v_paying_acc.type NOT IN ('checking', 'savings', 'cash', 'investment') THEN
    RAISE EXCEPTION 'Paying account must be an asset account (checking, savings, cash, or investment)';
  END IF;

  -- Verify loan account is owned by user and is a liability type
  SELECT id, user_id, type, currency, name INTO v_loan_acc
  FROM public.accounts
  WHERE id = p_loan_account_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan account not found or access denied';
  END IF;

  IF v_loan_acc.type NOT IN ('loan', 'credit_card') THEN
    RAISE EXCEPTION 'Target account must be a liability account (loan or credit card)';
  END IF;

  -- Verify currency match between paying asset account and target loan account
  IF UPPER(v_paying_acc.currency) != UPPER(v_loan_acc.currency) THEN
    RAISE EXCEPTION 'Currency mismatch: Paying account is in % while loan account is in %. Cross-currency repayments are not supported', v_paying_acc.currency, v_loan_acc.currency;
  END IF;

  -- Validate optional interest
  IF p_interest_amount IS NOT NULL AND p_interest_amount > 0 THEN
    IF p_interest_category_id IS NULL THEN
      RAISE EXCEPTION 'Category is required when recording an interest expense';
    END IF;

    SELECT id, type INTO v_interest_cat
    FROM public.categories
    WHERE id = p_interest_category_id AND (user_id = v_user_id OR is_system = true);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Interest category not found or access denied';
    END IF;

    IF v_interest_cat.type != 'expense' THEN
      RAISE EXCEPTION 'Interest category must be an expense category';
    END IF;
  END IF;

  -- 1. Insert Principal Repayment
  INSERT INTO public.transactions (
    user_id,
    account_id,
    destination_account_id,
    category_id,
    type,
    amount,
    date,
    description,
    notes
  ) VALUES (
    v_user_id,
    p_paying_account_id,
    p_loan_account_id,
    NULL,
    'loan_repayment',
    p_principal_amount,
    p_date,
    COALESCE(NULLIF(TRIM(p_description), ''), 'Loan Repayment: ' || v_loan_acc.name),
    p_notes
  ) RETURNING id INTO v_repayment_tx_id;

  -- 2. Insert Interest Expense (if specified)
  IF p_interest_amount IS NOT NULL AND p_interest_amount > 0 THEN
    INSERT INTO public.transactions (
      user_id,
      account_id,
      destination_account_id,
      category_id,
      type,
      amount,
      date,
      description,
      notes
    ) VALUES (
      v_user_id,
      p_paying_account_id,
      NULL,
      p_interest_category_id,
      'expense',
      p_interest_amount,
      p_date,
      'Loan Interest: ' || v_loan_acc.name,
      COALESCE(p_notes, 'Interest portion of loan payment')
    ) RETURNING id INTO v_interest_tx_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'repaymentTransactionId', v_repayment_tx_id,
    'interestTransactionId', v_interest_tx_id,
    'principalAmount', p_principal_amount,
    'interestAmount', COALESCE(p_interest_amount, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_loan_repayment TO authenticated;

-- 10. ATOMIC OPENING BALANCE CORRECTION RPC
-- Eliminates read-modify-write concurrency race when adjusting an account's initial opening balance.
-- Updates initial_balance and atomically shifts current_balance by the exact delta under row lock.
CREATE OR REPLACE FUNCTION public.fn_correct_opening_balance(
  p_account_id UUID,
  p_new_initial_balance NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_old_initial NUMERIC;
  v_diff NUMERIC;
  v_updated_acc RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: valid user session required';
  END IF;

  IF p_account_id IS NULL THEN
    RAISE EXCEPTION 'Account identifier is required';
  END IF;

  IF p_new_initial_balance IS NULL THEN
    RAISE EXCEPTION 'New initial balance is required';
  END IF;

  -- Select and lock target account row for atomic update
  SELECT initial_balance INTO v_old_initial
  FROM public.accounts
  WHERE id = p_account_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found or access denied';
  END IF;

  v_diff := p_new_initial_balance - v_old_initial;

  -- Atomically update initial_balance and shift current_balance by exact delta
  UPDATE public.accounts
  SET initial_balance = p_new_initial_balance,
      current_balance = current_balance + v_diff,
      updated_at = now()
  WHERE id = p_account_id AND user_id = v_user_id
  RETURNING * INTO v_updated_acc;

  RETURN to_jsonb(v_updated_acc);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_correct_opening_balance TO authenticated;
