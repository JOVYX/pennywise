import {
  Account,
  Category,
  Transaction,
  SavingsGoal,
  Debt,
  RecurringRule,
  BudgetConfig,
  FinancialSummary,
  BudgetAllowanceStrategy
} from '../types';

export interface AccountBalanceMap {
  [accountId: string]: {
    account: Account;
    currentBalancePaise: number;
    totalIncomePaise: number;
    totalExpensePaise: number;
    transfersInPaise: number;
    transfersOutPaise: number;
  };
}

/**
 * Calculates current actual balance for each account and combined total.
 * Invariant: Internal transfers adjust individual account balances,
 * but net sum across all tracked accounts is strictly unchanged.
 */
export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): {
  balancesByAccount: AccountBalanceMap;
  actualTotalBalancePaise: number;
} {
  const balancesByAccount: AccountBalanceMap = {};

  for (const account of accounts) {
    balancesByAccount[account.id] = {
      account,
      currentBalancePaise: account.openingBalancePaise,
      totalIncomePaise: 0,
      totalExpensePaise: 0,
      transfersInPaise: 0,
      transfersOutPaise: 0
    };
  }

  for (const tx of transactions) {
    if (tx.type === 'income') {
      if (balancesByAccount[tx.accountId]) {
        balancesByAccount[tx.accountId].totalIncomePaise += tx.amountPaise;
        balancesByAccount[tx.accountId].currentBalancePaise += tx.amountPaise;
      }
    } else if (tx.type === 'expense') {
      if (balancesByAccount[tx.accountId]) {
        balancesByAccount[tx.accountId].totalExpensePaise += tx.amountPaise;
        balancesByAccount[tx.accountId].currentBalancePaise -= tx.amountPaise;
      }
    } else if (tx.type === 'transfer') {
      if (balancesByAccount[tx.accountId]) {
        balancesByAccount[tx.accountId].transfersOutPaise += tx.amountPaise;
        balancesByAccount[tx.accountId].currentBalancePaise -= tx.amountPaise;
      }
      if (tx.toAccountId && balancesByAccount[tx.toAccountId]) {
        balancesByAccount[tx.toAccountId].transfersInPaise += tx.amountPaise;
        balancesByAccount[tx.toAccountId].currentBalancePaise += tx.amountPaise;
      }
    }
  }

  let actualTotalBalancePaise = 0;
  for (const accId in balancesByAccount) {
    actualTotalBalancePaise += balancesByAccount[accId].currentBalancePaise;
  }

  return { balancesByAccount, actualTotalBalancePaise };
}

/**
 * Calculates monthly financial summary for the selected month (YYYY-MM).
 */
export function calculateMonthlySummary(params: {
  monthKey: string; // YYYY-MM
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  savingsGoals: SavingsGoal[];
  debts: Debt[];
  recurringRules: RecurringRule[];
  budget?: BudgetConfig;
}): FinancialSummary {
  const {
    monthKey,
    accounts,
    transactions,
    categories,
    savingsGoals,
    debts,
    recurringRules,
    budget
  } = params;

  // 1. Calculate overall actual balance from all transactions to date
  const { actualTotalBalancePaise } = calculateAccountBalances(accounts, transactions);

  // 2. Filter transactions for the requested month
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  let totalIncomeReceivedThisMonthPaise = 0;
  let totalExpensesThisMonthPaise = 0;
  let essentialExpensesThisMonthPaise = 0;
  let discretionaryExpensesThisMonthPaise = 0;

  for (const tx of transactions) {
    if (!tx.date.startsWith(monthKey)) continue;

    if (tx.type === 'income') {
      totalIncomeReceivedThisMonthPaise += tx.amountPaise;
    } else if (tx.type === 'expense') {
      totalExpensesThisMonthPaise += tx.amountPaise;
      const cat = categoryMap.get(tx.categoryId);
      if (cat?.classification === 'essential') {
        essentialExpensesThisMonthPaise += tx.amountPaise;
      } else {
        discretionaryExpensesThisMonthPaise += tx.amountPaise;
      }
    }
    // Transfers are excluded from income and expenses!
  }

  // 3. Savings allocations
  const totalAllocatedToSavingsPaise = savingsGoals.reduce(
    (sum, g) => sum + (g.currentAmountPaise || 0),
    0
  );

  // 4. Reserved money for upcoming obligations (unpaid recurring bills this month + unpaid minimum debt due this month)
  let reservedForBillsAndDebtPaise = 0;
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  if (monthKey === currentMonthKey) {
    // Unpaid recurring expenses due later this month
    for (const rule of recurringRules) {
      if (rule.isActive && rule.type === 'expense' && rule.nextDueDate.startsWith(monthKey)) {
        if (new Date(rule.nextDueDate) >= now) {
          reservedForBillsAndDebtPaise += rule.amountPaise;
        }
      }
    }

    // Minimum debt payments due this month
    for (const debt of debts) {
      if (!debt.isPaidOff && debt.currentBalancePaise > 0) {
        const minDue = debt.minimumPaymentPaise || debt.emiAmountPaise || 0;
        reservedForBillsAndDebtPaise += Math.min(minDue, debt.currentBalancePaise);
      }
    }
  }

  // 5. Available to spend: Cash that is NOT allocated to savings goals or reserved for pending bills
  const netSpendablePaise =
    actualTotalBalancePaise - totalAllocatedToSavingsPaise - reservedForBillsAndDebtPaise;
  const isOvercommitted = netSpendablePaise < 0;
  const overcommittedPaise = isOvercommitted ? Math.abs(netSpendablePaise) : 0;
  const availableToSpendPaise = Math.max(0, netSpendablePaise);

  // 6. Expected future income this month
  let expectedFutureIncomeThisMonthPaise = 0;
  if (monthKey === currentMonthKey) {
    for (const rule of recurringRules) {
      if (rule.isActive && rule.type === 'income' && rule.nextDueDate.startsWith(monthKey)) {
        if (new Date(rule.nextDueDate) >= now) {
          expectedFutureIncomeThisMonthPaise += rule.amountPaise;
        }
      }
    }
  }

  // 7. Savings rate:
  // Formula: If income > 0, ((income - expenses) / income) * 100. Clamped between 0 and 100.
  let savingsRatePercentage = 0;
  if (totalIncomeReceivedThisMonthPaise > 0) {
    const netSaved = totalIncomeReceivedThisMonthPaise - totalExpensesThisMonthPaise;
    savingsRatePercentage = Math.max(
      0,
      Math.min(100, Math.round((netSaved / totalIncomeReceivedThisMonthPaise) * 100))
    );
  }

  // 8. Budget utilization and remaining budget
  const effectiveBudgetLimitPaise = budget?.overallLimitPaise || 0;
  let budgetUtilizationPercentage = 0;
  let remainingMonthlyBudgetPaise = 0;

  if (effectiveBudgetLimitPaise > 0) {
    budgetUtilizationPercentage = Math.round(
      (totalExpensesThisMonthPaise / effectiveBudgetLimitPaise) * 100
    );
    remainingMonthlyBudgetPaise = Math.max(0, effectiveBudgetLimitPaise - totalExpensesThisMonthPaise);
  }

  return {
    actualTotalBalancePaise,
    totalIncomeReceivedThisMonthPaise,
    totalExpensesThisMonthPaise,
    totalAllocatedToSavingsPaise,
    reservedForBillsAndDebtPaise,
    availableToSpendPaise,
    isOvercommitted,
    overcommittedPaise,
    expectedFutureIncomeThisMonthPaise,
    essentialExpensesThisMonthPaise,
    discretionaryExpensesThisMonthPaise,
    savingsRatePercentage,
    budgetUtilizationPercentage,
    remainingMonthlyBudgetPaise
  };
}

/**
 * Calculates daily spending allowance for the user based on available cash and runway.
 */
export function calculateDailyAllowance(params: {
  availableToSpendPaise: number;
  remainingMonthlyBudgetPaise?: number;
  nextExpectedIncomeDate?: string;
  strategy?: BudgetAllowanceStrategy;
  currentDate?: Date;
}): {
  dailyLimitPaise: number;
  daysRemaining: number;
  cushionPercent: number;
  explanation: string;
} {
  const {
    availableToSpendPaise,
    remainingMonthlyBudgetPaise = 0,
    nextExpectedIncomeDate,
    strategy = 'balanced',
    currentDate = new Date()
  } = params;

  const validCurrentDate =
    currentDate instanceof Date && !isNaN(currentDate.getTime()) ? currentDate : new Date();

  // Determine days remaining until next income or end of current month
  let targetDate: Date;
  let hasTargetIncomeDate = false;

  if (nextExpectedIncomeDate) {
    const parsed = new Date(nextExpectedIncomeDate);
    if (!isNaN(parsed.getTime()) && parsed > validCurrentDate) {
      targetDate = parsed;
      hasTargetIncomeDate = true;
    } else {
      // Default to end of current month
      targetDate = new Date(
        validCurrentDate.getFullYear(),
        validCurrentDate.getMonth() + 1,
        0,
        23,
        59,
        59
      );
    }
  } else {
    // End of current month
    targetDate = new Date(
      validCurrentDate.getFullYear(),
      validCurrentDate.getMonth() + 1,
      0,
      23,
      59,
      59
    );
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.ceil((targetDate.getTime() - validCurrentDate.getTime()) / msPerDay);
  const daysRemaining = Math.max(1, daysDiff);

  // Strategy safety cushion:
  // Conservative: 15% safety buffer withheld
  // Balanced: 5% safety buffer withheld
  // Flexible: 0% safety buffer
  const cushionPercent = strategy === 'conservative' ? 15 : strategy === 'balanced' ? 5 : 0;
  const multiplier = (100 - cushionPercent) / 100;

  // Cash limit vs Budget limit: Daily limit should respect both available spendable cash and budget!
  let baseFundPaise = Math.max(0, availableToSpendPaise);
  if (remainingMonthlyBudgetPaise > 0 && remainingMonthlyBudgetPaise < baseFundPaise) {
    baseFundPaise = remainingMonthlyBudgetPaise;
  }

  const effectiveFundsPaise = Math.max(0, Math.floor(baseFundPaise * multiplier));
  const dailyLimitPaise = Math.floor(effectiveFundsPaise / daysRemaining);

  const explanation = hasTargetIncomeDate
    ? `Based on ${daysRemaining} days until expected income (${nextExpectedIncomeDate}) with a ${cushionPercent}% ${strategy} safety buffer.`
    : `Based on ${daysRemaining} days remaining in the month with a ${cushionPercent}% ${strategy} safety buffer.`;

  return {
    dailyLimitPaise,
    daysRemaining,
    cushionPercent,
    explanation
  };
}

/**
 * Transparent, rule-based financial insights and actionable "Ways to Save"
 * No external AI or privacy leaks — 100% deterministic local computation.
 */
export interface ActionableInsight {
  id: string;
  type: 'tip' | 'warning' | 'success' | 'opportunity';
  title: string;
  description: string;
  estimatedMonthlySavingsPaise?: number;
  category?: string;
}

export function generateActionableInsights(params: {
  transactions: Transaction[];
  categories: Category[];
  monthKey: string;
  summary: FinancialSummary;
  debts: Debt[];
  recurringRules: RecurringRule[];
}): ActionableInsight[] {
  const { transactions, monthKey, summary, debts, recurringRules } = params;
  const insights: ActionableInsight[] = [];

  const monthTransactions = transactions.filter((t) => t.date.startsWith(monthKey));

  // Spending per category this month
  const categorySpendingPaise: Record<string, number> = {};
  for (const tx of monthTransactions) {
    if (tx.type === 'expense') {
      categorySpendingPaise[tx.categoryId] =
        (categorySpendingPaise[tx.categoryId] || 0) + tx.amountPaise;
    }
  }

  // Rule 1: Chai, Snacks & Tapri spending
  const chaiSpending = categorySpendingPaise['chai-snacks'] || 0;
  const foodSpending = (categorySpendingPaise['food-mess'] || 0) + chaiSpending;
  if (chaiSpending > 120000 && foodSpending > 0 && chaiSpending / foodSpending > 0.25) {
    // More than 25% of food money spent on snacks & chai
    const potentialSavingPaise = Math.floor(chaiSpending * 0.35); // 35% cut
    insights.push({
      id: 'snack-audit',
      type: 'opportunity',
      title: 'Chai & Snacks Optimization',
      description: `You spent ${Math.round((chaiSpending / foodSpending) * 100)}% of your food budget on snacks & cafe visits. Preparing snacks at your PG or carrying college canteen fruit can save around ₹${Math.floor(potentialSavingPaise / 100)}/mo.`,
      estimatedMonthlySavingsPaise: potentialSavingPaise,
      category: 'chai-snacks'
    });
  }

  // Rule 2: Subscriptions review
  const activeSubs = recurringRules.filter((r) => r.isActive && r.categoryId === 'subscriptions');
  const totalSubPaise = activeSubs.reduce((sum, r) => sum + r.amountPaise, 0);
  if (activeSubs.length >= 2 && totalSubPaise > 40000) {
    insights.push({
      id: 'sub-audit',
      type: 'tip',
      title: 'Review Digital Subscriptions',
      description: `You have ${activeSubs.length} recurring digital subscriptions totaling ₹${(totalSubPaise / 100).toFixed(0)}/mo. Consider family plans or college student discount verification to reduce this cost.`,
      estimatedMonthlySavingsPaise: Math.floor(totalSubPaise * 0.4),
      category: 'subscriptions'
    });
  }

  // Rule 3: Discretionary Spending Ratio
  if (summary.totalExpensesThisMonthPaise > 0) {
    const discretionaryRatio =
      summary.discretionaryExpensesThisMonthPaise / summary.totalExpensesThisMonthPaise;
    if (discretionaryRatio > 0.45) {
      const excessPaise = Math.floor(
        summary.discretionaryExpensesThisMonthPaise - summary.totalExpensesThisMonthPaise * 0.3
      );
      insights.push({
        id: 'discretionary-ratio-high',
        type: 'warning',
        title: 'High Discretionary Spending',
        description: `${Math.round(discretionaryRatio * 100)}% of your expenses this month went to non-essentials (entertainment, shopping, treats). Trimming this closer to 30% keeps debt away and builds your savings cushion.`,
        estimatedMonthlySavingsPaise: Math.max(0, excessPaise)
      });
    }
  }

  // Rule 4: Outstanding Debts
  const activeDebts = debts.filter((d) => !d.isPaidOff && d.currentBalancePaise > 0);
  if (activeDebts.length > 0) {
    const totalDebtPaise = activeDebts.reduce((sum, d) => sum + d.currentBalancePaise, 0);
    insights.push({
      id: 'debt-clearance',
      type: 'warning',
      title: 'Prioritize Active Repayments',
      description: `You have ₹${(totalDebtPaise / 100).toFixed(0)} across ${activeDebts.length} outstanding loan / friend obligations. Clearing these promptly avoids personal friction and student interest charges.`,
      category: 'debt-repayment'
    });
  }

  // Rule 5: Healthy Savings Celebration
  if (summary.savingsRatePercentage >= 20) {
    insights.push({
      id: 'great-savings-rate',
      type: 'success',
      title: 'Exceptional Savings Habit!',
      description: `You are saving ${summary.savingsRatePercentage}% of your income this month! Financial planners recommend a 20% savings target for students and early professionals.`
    });
  }

  // Rule 6: Zero-spend day tracking
  const daySpendCount = new Set<string>();
  for (const tx of monthTransactions) {
    if (tx.type === 'expense') {
      daySpendCount.add(tx.date.slice(0, 10));
    }
  }
  const currentDay = new Date().getDate();
  const zeroSpendDays = Math.max(0, currentDay - daySpendCount.size);
  if (zeroSpendDays >= 3) {
    insights.push({
      id: 'zero-spend-days',
      type: 'success',
      title: `${zeroSpendDays} Zero-Expense Days`,
      description: `You avoided unnecessary spending on ${zeroSpendDays} days this month. Intentional no-spend days prevent lifestyle inflation.`
    });
  }

  return insights;
}
