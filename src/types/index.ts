export type TransactionType = 'expense' | 'income' | 'transfer';
export type PaymentMethod = 'upi' | 'cash' | 'card' | 'netbanking' | 'other';
export type CategoryClassification = 'essential' | 'discretionary';
export type AccountType = 'bank' | 'cash' | 'wallet' | 'other';
export type GoalPriority = 'high' | 'medium' | 'low';
export type DebtType = 'personal_debt' | 'credit_card' | 'bnpl' | 'loan' | 'lent_to_friend';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';
export type BudgetAllowanceStrategy = 'conservative' | 'balanced' | 'flexible';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalancePaise: number;
  color: string;
  icon: string;
  isDefault?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  classification: CategoryClassification;
  icon: string;
  color: string;
  monthlyLimitPaise?: number;
  subcategories?: string[];
  isDefault?: boolean;
  order?: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amountPaise: number; // Stored as integer paise (₹1 = 100 paise)
  accountId: string;
  toAccountId?: string; // For transfers
  categoryId: string;
  subCategory?: string;
  date: string; // ISO 8601 string: YYYY-MM-DDTHH:mm:ss
  merchant: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  tags?: string[];
  recurringRuleId?: string;
  isRefund?: boolean;
  linkedExpenseId?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoalHistory {
  id: string;
  date: string;
  amountPaise: number;
  type: 'deposit' | 'withdrawal';
  note?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmountPaise: number;
  currentAmountPaise: number; // Allocated portion of cash reserves
  targetDate?: string; // YYYY-MM-DD
  priority: GoalPriority;
  icon: string;
  color: string;
  notes?: string;
  history: SavingsGoalHistory[];
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id: string;
  date: string;
  amountPaise: number;
  principalPaise: number;
  interestPaise: number;
  transactionId?: string;
  note?: string;
}

export interface Debt {
  id: string;
  name: string;
  lender: string;
  type: DebtType;
  originalAmountPaise: number;
  currentBalancePaise: number;
  interestRatePercent?: number;
  minimumPaymentPaise?: number;
  emiAmountPaise?: number;
  dueDate?: string; // YYYY-MM-DD or day of month
  payments: DebtPayment[];
  isPaidOff: boolean;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringRule {
  id: string;
  type: 'expense' | 'income';
  name: string;
  amountPaise: number;
  accountId: string;
  categoryId: string;
  frequency: RecurringFrequency;
  intervalDays?: number;
  nextDueDate: string; // YYYY-MM-DD
  isActive: boolean;
  paymentMethod: PaymentMethod;
  merchant: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetConfig {
  month: string; // YYYY-MM
  overallLimitPaise?: number;
  categoryLimits: Record<string, number>; // categoryId -> limit in paise
  weeklyDiscretionaryLimitPaise?: number;
  enableRollover?: boolean;
  warningThresholds: [number, number, number]; // e.g. [70, 85, 100]
}

export interface SecuritySettings {
  pinEnabled: boolean;
  pinHash?: string;
  biometricEnabled?: boolean;
  autoLockMinutes?: number; // 0 = immediate, 1, 5, 15
}

export interface AppSettings {
  currency: string;
  currencySymbol: string;
  theme: 'dark' | 'light' | 'system';
  firstDayOfWeek: number; // 0 = Sunday, 1 = Monday
  showPaise: boolean;
  dailyAllowanceStrategy: BudgetAllowanceStrategy;
  nextExpectedIncomeDate?: string;
  onboardingCompleted: boolean;
  lastBackupDate?: string;
  hasSampleData?: boolean;
  security?: SecuritySettings;
}

export interface FinancialSummary {
  actualTotalBalancePaise: number;
  totalIncomeReceivedThisMonthPaise: number;
  totalExpensesThisMonthPaise: number;
  totalAllocatedToSavingsPaise: number;
  reservedForBillsAndDebtPaise: number;
  availableToSpendPaise: number;
  expectedFutureIncomeThisMonthPaise: number;
  essentialExpensesThisMonthPaise: number;
  discretionaryExpensesThisMonthPaise: number;
  savingsRatePercentage: number;
  budgetUtilizationPercentage: number;
  remainingMonthlyBudgetPaise: number;
}

export type SplitMethod = 'equal' | 'exact' | 'shares';

export interface SplitParticipant {
  id: string;
  name: string;
  isSelf: boolean;
  amountPaise: number;
  shares?: number;
}

export interface BillSplitPlan {
  title: string;
  totalAmountPaise: number;
  payerName: string;
  isPayerSelf: boolean;
  method: SplitMethod;
  participants: SplitParticipant[];
  categoryId: string;
  date: string;
}

export interface ParsedSmsTransaction {
  type: TransactionType;
  amountPaise: number;
  merchant: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  date: string;
  confidence: 'high' | 'medium' | 'low';
  accountHint?: string;
  rawText: string;
}
