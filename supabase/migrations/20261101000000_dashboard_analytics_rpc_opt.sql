-- Migration: 20261101000000_dashboard_analytics_rpc_opt.sql
-- Description: Optimizes public.fn_get_analytics_data RPC with optional p_include_trend parameter (default true).
--              When p_include_trend is false (dashboard caller), monthly trend calculations and
--              unbudgeted spending anti-joins are bypassed, returning empty arrays and reducing latency.

-- 1. Explicitly drop legacy 6-parameter overload to prevent ambiguous RPC resolution in PostgREST
DROP FUNCTION IF EXISTS public.fn_get_analytics_data(DATE, DATE, DATE, DATE, VARCHAR, JSONB);

-- 2. Create updated 7-parameter function with procedural conditional branching
CREATE OR REPLACE FUNCTION public.fn_get_analytics_data(
  p_start_date DATE,
  p_end_date_exclusive DATE,
  p_prev_start_date DATE,
  p_prev_end_date_exclusive DATE,
  p_default_currency VARCHAR(10) DEFAULT 'INR',
  p_months JSONB DEFAULT '[]'::jsonb,
  p_include_trend BOOLEAN DEFAULT true
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

  IF p_include_trend THEN
    -- Full analytics calculation (includes monthly trend and unbudgeted spending)
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
        COALESCE(crp.raw_net_expense, 0.00)::NUMERIC(14, 2) AS raw_net_spent,
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

  ELSE
    -- Dashboard-optimized calculation: skips monthly trend grouping and unbudgeted anti-join
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
        (t.date >= p_prev_start_date AND t.date < p_prev_end_date_exclusive) AS is_prev
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
        COALESCE(crp.raw_net_expense, 0.00)::NUMERIC(14, 2) AS raw_net_spent,
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
      'monthlyTrend', '[]'::jsonb,
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
      'unbudgetedSpending', '[]'::jsonb,
      'hasTransactions', (
        (SELECT (tx_count + foreign_tx_count) > 0 FROM current_aggregates)
      )
    ) INTO v_result;

  END IF;

  RETURN v_result;
END;
$$;

-- LEAST-PRIVILEGE PERMISSION HARDENING

REVOKE ALL ON FUNCTION public.fn_get_analytics_data(
    DATE, DATE, DATE, DATE, VARCHAR, JSONB, BOOLEAN
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.fn_get_analytics_data(
    DATE, DATE, DATE, DATE, VARCHAR, JSONB, BOOLEAN
) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_get_analytics_data(
    DATE, DATE, DATE, DATE, VARCHAR, JSONB, BOOLEAN
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_get_analytics_data(
    DATE, DATE, DATE, DATE, VARCHAR, JSONB, BOOLEAN
) TO service_role;
