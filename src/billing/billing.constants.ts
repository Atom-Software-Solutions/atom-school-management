/**
 * Billing constants. `Payment.status` and `Payment.payment_method` are stored as
 * strings (the table pre-dates billing), so these lists are the source of truth.
 */
export const PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['CASH', 'BANK_DEPOSIT', 'MOBILE_MONEY', 'CHEQUE', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Amount strings accepted by the API: up to 12 integer digits, up to 2 decimals. */
export const AMOUNT_REGEX = /^\d{1,12}(\.\d{1,2})?$/;

/** Stable error codes the client can switch on. */
export const BillingErrorCode = {
  STRUCTURE_LOCKED: 'FEE_STRUCTURE_LOCKED',
  CATEGORY_INACTIVE: 'FEE_CATEGORY_INACTIVE',
  TERM_NOT_IN_YEAR: 'TERM_NOT_IN_ACADEMIC_YEAR',
} as const;

export const DEFAULT_FEE_CATEGORIES: ReadonlyArray<{ code: string; name: string; description: string }> = [
  { code: 'TUITION', name: 'Tuition', description: 'Core teaching fees' },
  { code: 'BOARDING', name: 'Boarding', description: 'Accommodation and boarding' },
  { code: 'MEALS', name: 'Meals', description: 'Lunch / meals programme' },
  { code: 'TRANSPORT', name: 'Transport', description: 'School bus / transport' },
  { code: 'EXAM', name: 'Examination', description: 'Internal and external examinations' },
  { code: 'UNIFORM', name: 'Uniform', description: 'Uniforms and sportswear' },
  { code: 'DEVELOPMENT', name: 'Development fund', description: 'Infrastructure and development levy' },
  { code: 'MISC', name: 'Miscellaneous', description: 'Other charges' },
];

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_DEPOSIT: 'Bank deposit',
  MOBILE_MONEY: 'Mobile money',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};
export const paymentMethodLabelForCsv = (m: string) => PAYMENT_METHOD_LABELS[m as PaymentMethod] ?? m;
