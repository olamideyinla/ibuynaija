-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 023: Nigeria Payroll
--
-- Tables: payroll_settings, payroll_employees, payroll_runs, payslip_records,
--         remittance_obligations
--
-- Nigeria-only, under the Nigeria Tax Act (NTA) 2025 (effective 2026-01-01).
-- Seller-scoped with app-level access control (no RLS), matching the rest of the
-- seller dashboard. All tax logic lives in lib/payroll/ (never in SQL or pages).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── payroll_settings — one row per seller ────────────────────────────────────
CREATE TABLE payroll_settings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id                UUID NOT NULL UNIQUE REFERENCES sellers(id) ON DELETE CASCADE,
  is_registered_employer   BOOLEAN NOT NULL DEFAULT FALSE,
  employer_tax_id          TEXT,
  pension_enrolled         BOOLEAN NOT NULL DEFAULT TRUE,
  pfa_name                 TEXT,
  pfa_account_number       TEXT,
  state_of_operation       TEXT,
  nhf_enrolled             BOOLEAN NOT NULL DEFAULT FALSE,
  nhis_enrolled            BOOLEAN NOT NULL DEFAULT FALSE,
  pay_day                  INTEGER NOT NULL DEFAULT 25 CHECK (pay_day BETWEEN 1 AND 28),
  rate_overrides           JSONB NOT NULL DEFAULT '[]',
  default_salary_structure JSONB,
  date_created             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── payroll_employees — an employer's staff (merges worker + payroll profile) ──
CREATE TABLE payroll_employees (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id              UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  salary_type            TEXT NOT NULL CHECK (salary_type IN ('monthly', 'daily')),
  gross_monthly_salary   NUMERIC(14,2),
  daily_rate             NUMERIC(14,2),
  salary_structure       JSONB NOT NULL DEFAULT '{}',
  tax_id                 TEXT,
  annual_rent_paid       NUMERIC(14,2),
  has_rent_documentation BOOLEAN NOT NULL DEFAULT FALSE,
  pension_applicable     BOOLEAN NOT NULL DEFAULT TRUE,
  pension_pin            TEXT,
  nhf_applicable         BOOLEAN NOT NULL DEFAULT FALSE,
  nhis_applicable        BOOLEAN NOT NULL DEFAULT FALSE,
  life_insurance_premium NUMERIC(14,2),
  other_deductions       JSONB NOT NULL DEFAULT '[]',
  bank_name              TEXT,
  bank_account_number    TEXT,
  start_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  active                 BOOLEAN NOT NULL DEFAULT TRUE,
  date_created           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX payroll_employees_seller_idx ON payroll_employees (seller_id);

-- ── payroll_runs — one monthly run per seller per period ──────────────────────
CREATE TABLE payroll_runs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id                 UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  period                    TEXT NOT NULL,   -- YYYY-MM
  status                    TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'approved', 'paid')),
  run_date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_by               TEXT,
  approved_at               TIMESTAMPTZ,
  total_gross_pay           NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net_pay             NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_employee_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_employer_costs      NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_paye                NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_pension             NUMERIC(14,2) NOT NULL DEFAULT 0,
  employee_count            INTEGER NOT NULL DEFAULT 0,
  profile_version_date      TEXT NOT NULL,
  notes                     TEXT,
  date_created              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seller_id, period)
);
CREATE INDEX payroll_runs_seller_period_idx ON payroll_runs (seller_id, period DESC);

-- ── payslip_records — one per employee per run ────────────────────────────────
CREATE TABLE payslip_records (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id         UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id            UUID NOT NULL REFERENCES payroll_employees(id) ON DELETE CASCADE,
  employee_name          TEXT NOT NULL,
  period                 TEXT NOT NULL,
  earnings               JSONB NOT NULL DEFAULT '[]',
  deductions             JSONB NOT NULL DEFAULT '[]',
  employer_contributions JSONB NOT NULL DEFAULT '[]',
  gross_pay              NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions       NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_pay                NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_employer_cost    NUMERIC(14,2) NOT NULL DEFAULT 0,
  taxable_income         NUMERIC(14,2) NOT NULL DEFAULT 0,
  applied_reliefs        JSONB NOT NULL DEFAULT '[]',
  assumptions            JSONB NOT NULL DEFAULT '[]',
  date_created           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX payslip_records_run_idx ON payslip_records (payroll_run_id);

-- ── remittance_obligations — statutory amounts due per run ─────────────────────
CREATE TABLE remittance_obligations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id          UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  payroll_run_id     UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  period             TEXT NOT NULL,
  deduction_type     TEXT NOT NULL,
  deduction_name     TEXT NOT NULL,
  total_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date           DATE NOT NULL,
  remittance_to      TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'remitted', 'overdue')),
  remitted_date      DATE,
  remitted_amount    NUMERIC(14,2),
  remitted_reference TEXT,
  date_created       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX remittance_obligations_seller_period_idx
  ON remittance_obligations (seller_id, period DESC);
CREATE INDEX remittance_obligations_status_idx
  ON remittance_obligations (seller_id, status);
