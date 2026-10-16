import { describe, it, expect } from 'vitest';
import {
  calculateAccountBalances,
  calculateMonthlySummary,
  calculateDailyAllowance,
  generateActionableInsights
} from '../src/utils/finance';
import { rupeesToPaise, paiseToRupees, formatINR } from '../src/utils/formatters';
import { Account, Transaction, Category, SavingsGoal, RecurringRule } from '../src/types';

describe('Financial Invariants and Calculations', () => {
  it('prevents floating point arithmetic errors with integer paise conversion', () => {
    // Standard JS float issue: 19.99 * 100 = 1998.9999999999998
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(rupeesToPaise('19.99')).toBe(1999);
    expect(rupeesToPaise('1,25,000.50')).toBe(12500050);
    expect(rupeesToPaise('₹500')).toBe(50000);
    expect(rupeesToPaise('-₹50.25')).toBe(-5025);
    expect(paiseToRupees(1999)).toBe(19.99);
  });

  it('formats Indian currency with proper Lakhs and Crores grouping', () => {
    expect(formatINR(12500000, { showPaise: false })).toBe('₹1,25,000');
    expect(formatINR(12500050, { showPaise: true })).toBe('₹1,25,000.50');
    expect(formatINR(-50000, { showPaise: false })).toBe('-₹500');
    expect(formatINR(1500000000, { compact: true })).toBe('₹1.5 Cr');
  });

  it('preserves combined actual balance across internal account transfers (Invariant 1 & 2)', () => {
    const accounts: Account[] = [
      {
        id: 'bank',
        name: 'Bank Account',
        type: 'bank',
        openingBalancePaise: 100000, // ₹1,000
        color: '#000',
        icon: 'Landmark',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z'
      },
      {
        id: 'wallet',
        name: 'UPI Wallet',
        type: 'wallet',
        openingBalancePaise: 50000, // ₹500
        color: '#000',
        icon: 'Smartphone',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z'
      }
    ];

    const initialBalances = calculateAccountBalances(accounts, []);
    expect(initialBalances.actualTotalBalancePaise).toBe(150000); // ₹1,500

    // Transfer ₹300 from bank to wallet
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'transfer',
        amountPaise: 30000, // ₹300
        accountId: 'bank',
        toAccountId: 'wallet',
        categoryId: 'misc',
        date: '2026-10-02T10:00:00Z',
        merchant: 'Self Transfer',
        paymentMethod: 'upi',
        createdAt: '2026-10-02T10:00:00Z',
        updatedAt: '2026-10-02T10:00:00Z'
      }
    ];

    const afterTransfer = calculateAccountBalances(accounts, transactions);
    // Bank is now 1000 - 300 = 700 (70000 paise)
    expect(afterTransfer.balancesByAccount['bank'].currentBalancePaise).toBe(70000);
    // Wallet is now 500 + 300 = 800 (80000 paise)
    expect(afterTransfer.balancesByAccount['wallet'].currentBalancePaise).toBe(80000);
    // Total combined balance is strictly unchanged at ₹1,500 (150000 paise)
    expect(afterTransfer.actualTotalBalancePaise).toBe(150000);
  });

  it('keeps expected income and unpaid bills strictly separate from actual cash (Invariant 3 & 4)', () => {
    const accounts: Account[] = [
      {
        id: 'bank',
        name: 'Bank',
        type: 'bank',
        openingBalancePaise: 500000, // ₹5,000 confirmed cash
        color: '#000',
        icon: 'Landmark',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z'
      }
    ];

    const categories: Category[] = [
      {
        id: 'salary',
        name: 'Stipend',
        type: 'income',
        classification: 'essential',
        icon: 'Briefcase',
        color: '#000'
      },
      {
        id: 'rent',
        name: 'Rent',
        type: 'expense',
        classification: 'essential',
        icon: 'Home',
        color: '#000'
      }
    ];

    // Scheduled future recurring income of ₹10,000 and future bill of ₹3,000
    const recurringRules: RecurringRule[] = [
      {
        id: 'rec-1',
        type: 'income',
        name: 'Expected Freelance Income',
        amountPaise: 1000000, // ₹10,000 expected
        accountId: 'bank',
        categoryId: 'salary',
        frequency: 'monthly',
        nextDueDate: '2026-10-28',
        isActive: true,
        paymentMethod: 'upi',
        merchant: 'Client',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z'
      },
      {
        id: 'rec-2',
        type: 'expense',
        name: 'Scheduled Rent Bill',
        amountPaise: 300000, // ₹3,000 bill
        accountId: 'bank',
        categoryId: 'rent',
        frequency: 'monthly',
        nextDueDate: '2026-10-30',
        isActive: true,
        paymentMethod: 'upi',
        merchant: 'Landlord',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z'
      }
    ];

    const summary = calculateMonthlySummary({
      monthKey: '2026-10',
      accounts,
      transactions: [],
      categories,
      savingsGoals: [],
      debts: [],
      recurringRules
    });

    // Actual balance must remain exactly opening balance (₹5,000)
    expect(summary.actualTotalBalancePaise).toBe(500000);
    // Expected income is acknowledged separately
    expect(summary.expectedFutureIncomeThisMonthPaise).toBe(1000000);
    // Scheduled bill is reserved for future obligation
    expect(summary.reservedForBillsAndDebtPaise).toBe(300000);
    // Available to spend is actual cash minus reserved obligations (5000 - 3000 = 2000)
    expect(summary.availableToSpendPaise).toBe(200000);
  });

  it('guarantees savings allocations do not create money or count as expenses (Invariant 5)', () => {
    const accounts: Account[] = [
      {
        id: 'bank',
        name: 'Bank',
        type: 'bank',
        openingBalancePaise: 1000000, // ₹10,000 cash
        color: '#000',
        icon: 'Landmark',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z'
      }
    ];

    const savingsGoals: SavingsGoal[] = [
      {
        id: 'goal-laptop',
        name: 'Laptop Goal',
        targetAmountPaise: 5000000, // ₹50,000 target
        currentAmountPaise: 400000, // ₹4,000 allocated
        priority: 'high',
        icon: 'Laptop',
        color: '#000',
        history: [],
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z'
      }
    ];

    const summary = calculateMonthlySummary({
      monthKey: '2026-10',
      accounts,
      transactions: [],
      categories: [],
      savingsGoals,
      debts: [],
      recurringRules: []
    });

    // Actual bank cash remains ₹10,000
    expect(summary.actualTotalBalancePaise).toBe(1000000);
    // Savings allocated is ₹4,000
    expect(summary.totalAllocatedToSavingsPaise).toBe(400000);
    // Available to spend is 10,000 - 4,000 = 6,000 (600000 paise)
    expect(summary.availableToSpendPaise).toBe(600000);
    // Expenses this month must NOT have increased!
    expect(summary.totalExpensesThisMonthPaise).toBe(0);
  });

  it('computes daily spending allowance realistically with safety buffers', () => {
    const allowance = calculateDailyAllowance({
      availableToSpendPaise: 1000000, // ₹10,000 available
      strategy: 'balanced', // 5% cushion
      currentDate: new Date('2026-10-15T10:00:00Z')
    });

    // October has 31 days. Day 15 to Day 31 = 16 or 17 days
    expect(allowance.dailyLimitPaise).toBeGreaterThan(0);
    expect(allowance.cushionPercent).toBe(5);
  });

  it('generates transparent, rule-based insights without external AI', () => {
    const categories: Category[] = [
      {
        id: 'chai-snacks',
        name: 'Chai & Snacks',
        type: 'expense',
        classification: 'discretionary',
        icon: 'Coffee',
        color: '#000'
      },
      {
        id: 'food-mess',
        name: 'Mess Food',
        type: 'expense',
        classification: 'essential',
        icon: 'Utensils',
        color: '#000'
      }
    ];

    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'expense',
        amountPaise: 200000, // ₹2,000 on chai & snacks
        accountId: 'bank',
        categoryId: 'chai-snacks',
        date: '2026-10-10T15:00:00Z',
        merchant: 'Tapri',
        paymentMethod: 'cash',
        createdAt: '2026-10-10T15:00:00Z',
        updatedAt: '2026-10-10T15:00:00Z'
      },
      {
        id: 'tx-2',
        type: 'expense',
        amountPaise: 300000, // ₹3,000 on mess
        accountId: 'bank',
        categoryId: 'food-mess',
        date: '2026-10-05T12:00:00Z',
        merchant: 'Mess',
        paymentMethod: 'upi',
        createdAt: '2026-10-05T12:00:00Z',
        updatedAt: '2026-10-05T12:00:00Z'
      }
    ];

    const summary = calculateMonthlySummary({
      monthKey: '2026-10',
      accounts: [
        {
          id: 'bank',
          name: 'Bank',
          type: 'bank',
          openingBalancePaise: 500000,
          color: '#000',
          icon: 'Landmark',
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z'
        }
      ],
      transactions,
      categories,
      savingsGoals: [],
      debts: [],
      recurringRules: []
    });

    const insights = generateActionableInsights({
      transactions,
      categories,
      monthKey: '2026-10',
      summary,
      debts: [],
      recurringRules: []
    });

    // Should flag Chai & Snacks optimization because chai (2000) is 40% of food (5000)
    const snackTip = insights.find((i) => i.id === 'snack-audit');
    expect(snackTip).toBeDefined();
    expect(snackTip?.estimatedMonthlySavingsPaise).toBeGreaterThan(0);
  });
});
