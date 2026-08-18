// ─────────────────────────────────────────────────────────────────────────────
// ibuynaija.com — Shared TypeScript types
// Generated from the data model in SPEC.md Section 5.
// ─────────────────────────────────────────────────────────────────────────────

// ─── ENUMS ───────────────────────────────────────────────────────────────────

export type StockChangeType =
  | 'platform_sale'
  | 'manual_adjustment'
  | 'restock'
  | 'offline_sale';

export type PromotionScope        = 'single_listing' | 'all_listings';
export type PromotionDiscountType = 'percentage' | 'fixed_amount';

export type ProviderType = 'seller' | 'provider' | 'both';
export type ListingCondition = 'new' | 'used';
export type ListingStatus = 'active' | 'sold' | 'expired';
export type DeliveryMethod = 'pickup' | 'delivery';
export type OrderStatus =
  | 'awaiting_payment'
  | 'payment_claimed'
  | 'confirmed_by_seller'
  | 'fulfilled'
  | 'cancelled';
export type BookingStatus =
  | 'requested'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';
export type PriceType = 'fixed' | 'quote';
export type ServiceLocationType = 'at_provider' | 'provider_travels';
export type CategorySection = 'marketplace' | 'services';
export type AdminRole = 'moderator' | 'verifier' | 'super_admin';
export type ListingReportReason =
  | 'not_made_in_nigeria'
  | 'counterfeit'
  | 'inappropriate';
export type RatingReportReason = 'fake' | 'inappropriate' | 'spam';

// ─── USERS & SELLERS ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  phone: string;
  email: string | null;
  is_buyer: boolean;
  is_seller: boolean;
  is_service_provider: boolean;
  saved_delivery_addresses: string[] | null;
  location_state: string | null;
  location_city: string | null;
  date_joined: string;
}

export interface Seller {
  id: string;
  user_id: string;
  slug: string;
  business_name: string;
  tagline: string | null;
  description: string | null;
  state: string;
  city_area: string;
  logo_photo_url: string | null;
  banner_image_url: string | null;
  // Bank details — never included in public API responses
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  verification_requested: boolean;
  verified_status: boolean;
  verified_date: string | null;
  verified_by: string | null;
  provider_type: ProviderType;
  date_created: string;
}

// Public seller profile (bank details stripped)
export type PublicSeller = Omit<
  Seller,
  'bank_account_name' | 'bank_account_number' | 'bank_name'
>;

// Seller profile with bank details — returned only on Order page
export type SellerWithBankDetails = Seller;

export interface SlugHistory {
  id: string;
  seller_id: string;
  old_slug: string;
  new_slug: string;
  changed_at: string;
}

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  section: CategorySection;
  sort_order: number;
}

// ─── LISTINGS ────────────────────────────────────────────────────────────────

/** One purchasable option within a Listing. */
export interface ListingVariant {
  id: string;
  listing_id: string;
  /** Key/value pairs describing this option, e.g. { size: "M", colour: "Blue" }.
   *  Empty object `{}` for implicit single-variant listings. */
  attributes: Record<string, string>;
  /** Overrides the listing's base price for this variant only. null = use listing.price. */
  price_override: number | null;
  stock_count: number;
  /** GENERATED ALWAYS AS (stock_count > 0) STORED */
  is_available: boolean;
  /** Alert when stock crosses below this value. null = no alert configured. */
  low_stock_threshold: number | null;
}

export interface StockEvent {
  id: string;
  variant_id: string;
  change_type: StockChangeType;
  /** Signed integer: positive for restock/adjustment-up, negative for sales */
  quantity_delta: number;
  /** Required for manual_adjustment; optional for other types */
  reason: string | null;
  date_created: string;
}

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  category_id: string;
  price: number | null;  // null = "Price on request" — enquire-only, no Add to Cart
  photos: string[];      // Cloudinary URLs; max 5
  made_in_nigeria: boolean;
  condition: ListingCondition;
  status: ListingStatus;
  date_posted: string;
  date_updated: string;
}

// Listing with joined seller data (used in search results and listing cards)
export interface ListingWithSeller extends Listing {
  seller: PublicSeller;
  category: Category;
  /** Computed 6-band ranking value (1–6); lower = higher priority */
  rank_band?: number;
  /** Engagement score: enquiries + (orders × 3) in last 30 days */
  engagement_score?: number;
  /** Average of buying_experience_score across all ratings */
  avg_buying_experience?: number;
  /** Average of product_quality_score across all ratings */
  avg_product_quality?: number;
  /** Total number of ratings */
  rating_count?: number;
}

export interface ListingReport {
  id: string;
  listing_id: string;
  reporter_id: string | null;
  reason: ListingReportReason;
  details: string | null;
  resolved: boolean;
  date_created: string;
}

// ─── PROMOTIONS ──────────────────────────────────────────────────────────────

export interface Promotion {
  id: string;
  seller_id: string;
  scope: PromotionScope;
  /** null when scope = 'all_listings' */
  listing_id: string | null;
  discount_type: PromotionDiscountType;
  /** Percentage (0–100) or Naira amount, depending on discount_type */
  discount_value: number;
  start_date: string;
  end_date: string;
  date_created: string;
}

// ─── CART ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  buyer_id: string;
  listing_id: string;
  variant_id: string;
  quantity: number;
  added_at: string;
  // Joined fields for display
  listing?: Listing & { seller: PublicSeller };
  /** Key/value pairs for the chosen variant (empty for implicit single-variant) */
  variant_attributes?: Record<string, string>;
  /** Available stock for the chosen variant */
  variant_stock?: number;
  /** True if listing.status is 'sold' or 'expired' */
  is_stale?: boolean;
}

// ─── CHECKOUT & ORDERS ───────────────────────────────────────────────────────

export interface CheckoutSession {
  id: string;
  buyer_id: string;
  delivery_method: DeliveryMethod;
  delivery_address: string | null;
  buyer_phone: string;
  buyer_email: string | null;
  created_at: string;
}

export interface OrderLineItem {
  listing_id: string;
  variant_id: string;
  /** Variant attributes snapshot at checkout time (e.g. { size: "M" }) */
  variant_attributes: Record<string, string>;
  title: string;
  qty: number;
  unit_price: number;
}

export interface Order {
  id: string;
  checkout_session_id: string;
  buyer_id: string;
  seller_id: string;
  line_items: OrderLineItem[];
  total: number;
  status: OrderStatus;
  receipt_attachment_url: string | null;
  date_created: string;
  date_updated: string;
}

// Order with joined seller (includes bank details — shown only to order participants)
export interface OrderWithSeller extends Order {
  seller: SellerWithBankDetails;
  checkout_session: CheckoutSession;
}

// ─── ENQUIRIES ───────────────────────────────────────────────────────────────

export interface Enquiry {
  id: string;
  buyer_id: string;
  listing_id: string;
  date_created: string;
}

// ─── RATINGS ─────────────────────────────────────────────────────────────────

export interface Rating {
  id: string;
  buyer_id: string;
  listing_id: string;
  buying_experience_score: number; // 1–5
  product_quality_score: number;   // 1–5
  comment: string | null;
  reported: boolean;
  date_created: string;
}

export interface RatingReport {
  id: string;
  rating_id: string;
  reporter_id: string | null;
  reason: RatingReportReason;
  details: string | null;
  resolved: boolean;
  date_created: string;
}

// ─── SERVICES ────────────────────────────────────────────────────────────────

export interface ServiceOffering {
  id: string;
  provider_id: string;
  name: string;
  category_id: string;
  description: string;
  price_type: PriceType;
  price: number | null;       // null for quote-type
  price_from: number | null;  // indicative "from" price for quote
  duration_minutes: number | null;
  location_type: ServiceLocationType;
  photos: string[];
  status: 'active' | 'inactive';
  date_created: string;
}

export interface ServiceOfferingWithProvider extends ServiceOffering {
  provider: PublicSeller;
  category: Category;
}

export interface AvailabilitySchedule {
  id: string;
  service_id: string;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
}

export interface AvailabilityBlock {
  id: string;
  service_id: string;
  blocked_date: string; // "YYYY-MM-DD"
}

export interface Booking {
  id: string;
  provider_id: string;
  service_id: string;
  buyer_id: string;
  requested_datetime: string;
  status: BookingStatus;
  quote_requested: boolean;
  confirmed_price: number | null;
  provider_note: string | null;
  notes: string | null;
  address: string | null;
  date_created: string;
  date_updated: string;
}

export interface BookingWithDetails extends Booking {
  service: ServiceOffering;
  provider: PublicSeller;
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  // password_hash intentionally omitted from the type (never sent to client)
  role: AdminRole;
  date_created: string;
}

export interface VerificationNote {
  id: string;
  seller_id: string;
  admin_id: string;
  text: string;
  date_created: string;
}

// ─── BUSINESS ACTIVITY (self-reported) ───────────────────────────────────────

export interface OfflineSale {
  id: string;
  seller_id: string;
  amount: number;
  date: string;         // "YYYY-MM-DD"
  note: string | null;
  listing_id: string | null;
  variant_id: string | null;
  quantity: number;
  date_created: string;
  // Joined fields for display
  listing_title?: string | null;
  variant_attributes?: Record<string, string> | null;
}

export interface Expense {
  id: string;
  seller_id: string;
  amount: number;
  date: string;         // "YYYY-MM-DD"
  category: string;
  note: string | null;
  date_created: string;
}

// ─── API HELPERS ─────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

// ─── SEARCH & RANKING ────────────────────────────────────────────────────────

export interface SearchParams {
  q?: string;           // Full-text query
  category?: string;    // Category slug
  state?: string;       // Buyer's state (for ranking)
  city?: string;        // Buyer's city/LGA (for ranking)
  page?: number;
  per_page?: number;
}

export interface RankingContext {
  buyer_state: string | null;
  buyer_city: string | null;
}

// ─── PAYROLL (Nigeria only — NTA 2025) ───────────────────────────────────────
// Tax logic lives in lib/payroll/. The engine operates on the camelCase domain
// types below; the runner maps DB rows (snake_case, at the bottom) to/from them.

// -- Country profile (matches lib/payroll/nigeria-profile.ts) --

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

export interface TaxSystem {
  name: string;
  period: 'annual' | 'monthly';
  brackets: TaxBracket[];
  minimumTax: { enabled: boolean; rate: number; basis: string } | null;
}

export interface StatutoryDeduction {
  id: string;
  name: string;
  shortCode: string;
  paidBy: 'employee' | 'employer' | 'both';
  employeeRate: number | null;
  employeeFixedAmount: number | null;
  employeeCap: number | null;
  employerRate: number | null;
  employerFixedAmount: number | null;
  employerCap: number | null;
  basis: 'gross' | 'basic' | 'pensionable' | 'basic_housing_transport' | 'custom' | 'graduated';
  basisDescription: string;
  preTax: boolean;
  mandatory: boolean;
  mandatoryConditions: string | null;
  notes: string | null;
}

export interface AllowanceType {
  id: string;
  name: string;
  taxable: boolean;
  partOfPensionable: boolean;
  commonPercentageOfBasic: number | null;
  notes: string | null;
}

export interface TaxRelief {
  id: string;
  name: string;
  type: 'fixed' | 'percentage' | 'capped_percentage' | 'graduated';
  value: number | null;
  cap: number | null;
  basis: string | null;
  requiresDocumentation: boolean;
  documentationDescription: string | null;
  conditions: string | null;
  notes: string | null;
}

export interface PayrollThreshold {
  id: string;
  name: string;
  annualAmount: number;
  description: string;
}

export interface CountryPayrollProfile {
  countryCode: string;
  countryName: string;
  currency: string;
  lastVerified: string;
  effectiveDate: string;
  sourceNotes: string;
  fiscalYearStart: string;
  taxYearStart: string;
  taxSystem: TaxSystem;
  statutoryDeductions: StatutoryDeduction[];
  allowanceTypes: AllowanceType[];
  taxReliefs: TaxRelief[];
  thresholds: PayrollThreshold[];
}

export interface PayrollRateOverride {
  deductionId: string;
  field: 'employeeRate' | 'employerRate' | 'employeeCap' | 'employerCap';
  originalValue: number;
  overrideValue: number;
  reason: string | null;
  setAt: string;
}

// -- Engine inputs (camelCase domain objects the engine reads) --

export interface SalaryStructure {
  basic: number;
  housing: number;
  transport: number;
  lunch?: number; // not pensionable; fully taxable
  otherAllowances: { name: string; amount: number; taxable: boolean }[];
  grossTotal: number;
}

export interface CustomDeduction {
  id: string;
  name: string;
  amount: number;
  frequency: 'once' | 'monthly' | 'until_cleared';
  remainingBalance: number | null;
  startMonth: string; // YYYY-MM
  endMonth: string | null;
}

/** Minimal settings the engine reads (rate overrides only). */
export interface PayrollSettingsInput {
  payrollRateOverrides: PayrollRateOverride[];
}

/** Employee data the engine reads to compute a payslip. */
export interface EmployeePayrollInput {
  employeeId: string;
  salaryType: 'monthly' | 'daily';
  grossMonthlySalary: number | null;
  dailyRate: number | null;
  salaryStructure: SalaryStructure;
  annualRentPaid: number | null;
  pensionApplicable: boolean;
  nhfApplicable: boolean;
  nhisApplicable: boolean;
  lifeInsurancePremium: number | null;
  otherDeductions: CustomDeduction[];
}

// -- Engine output --

export interface PayslipEarning {
  name: string;
  amount: number;
}

export interface PayslipDeduction {
  name: string;
  shortCode: string;
  amount: number;
  isStatutory: boolean;
}

export interface PayslipEmployerContribution {
  name: string;
  shortCode: string;
  amount: number;
}

/** Computed payslip content (before persistence). */
export interface ComputedPayslip {
  employeeId: string;
  period: string;
  earnings: PayslipEarning[];
  deductions: PayslipDeduction[];
  employerContributions: PayslipEmployerContribution[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  totalEmployerCost: number;
  taxableIncome: number;
  appliedReliefs: { name: string; amount: number }[];
  assumptions: string[];
}

// -- DB row types (snake_case, as returned by the pg driver) --

export interface PayrollSettingsRow {
  id: string;
  seller_id: string;
  is_registered_employer: boolean;
  employer_tax_id: string | null;
  pension_enrolled: boolean;
  pfa_name: string | null;
  pfa_account_number: string | null;
  state_of_operation: string | null;
  nhf_enrolled: boolean;
  nhis_enrolled: boolean;
  pay_day: number;
  rate_overrides: PayrollRateOverride[];
  default_salary_structure: unknown | null;
}

export interface PayrollEmployeeRow {
  id: string;
  seller_id: string;
  name: string;
  salary_type: 'monthly' | 'daily';
  gross_monthly_salary: string | null;
  daily_rate: string | null;
  salary_structure: SalaryStructure;
  tax_id: string | null;
  annual_rent_paid: string | null;
  has_rent_documentation: boolean;
  pension_applicable: boolean;
  pension_pin: string | null;
  nhf_applicable: boolean;
  nhis_applicable: boolean;
  life_insurance_premium: string | null;
  other_deductions: CustomDeduction[];
  bank_name: string | null;
  bank_account_number: string | null;
  start_date: string;
  active: boolean;
}

export interface PayrollRunRow {
  id: string;
  seller_id: string;
  period: string;
  status: 'draft' | 'approved' | 'paid';
  run_date: string;
  approved_by: string | null;
  approved_at: string | null;
  total_gross_pay: string;
  total_net_pay: string;
  total_employee_deductions: string;
  total_employer_costs: string;
  total_paye: string;
  total_pension: string;
  employee_count: number;
  profile_version_date: string;
  notes: string | null;
  date_created: string;
}

export interface PayslipRow {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_name: string;
  period: string;
  earnings: PayslipEarning[];
  deductions: PayslipDeduction[];
  employer_contributions: PayslipEmployerContribution[];
  gross_pay: string;
  total_deductions: string;
  net_pay: string;
  total_employer_cost: string;
  taxable_income: string;
  applied_reliefs: { name: string; amount: number }[];
  assumptions: string[];
}

export interface RemittanceRow {
  id: string;
  seller_id: string;
  payroll_run_id: string;
  period: string;
  deduction_type: string;
  deduction_name: string;
  total_amount: string;
  due_date: string;
  remittance_to: string;
  status: 'pending' | 'remitted' | 'overdue';
  remitted_date: string | null;
  remitted_amount: string | null;
  remitted_reference: string | null;
}
