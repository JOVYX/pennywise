import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateBillSplit, buildSplitSettlement } from '../src/utils/billSplitter';
import {
  calculateAccountBalances,
  calculateDailyAllowance,
  calculateMonthlySummary
} from '../src/utils/finance';
import { Transaction } from '../src/types';

describe('Financial Invariant Property Tests (fast-check)', () => {
  // Property 1: Zero Paise Loss in Bill Splitting
  it('Property 1: Equal splits always sum to totalPaise with exactly 0 paise loss', () => {
    fc.assert(
      fc.property(
        // Total paise: ₹0.01 to ₹1,00,000 in paise
        fc.integer({ min: 1, max: 10_000_000 }),
        // Participants: 1 to 50 people
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            isSelf: fc.boolean()
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (totalPaise, participants) => {
          const result = calculateBillSplit(totalPaise, participants, 'equal');
          const sum = result.participants.reduce((acc, p) => acc + p.amountPaise, 0);

          expect(sum).toBe(totalPaise);
          expect(result.remainderPaise).toBe(0);
          expect(result.participants.length).toBe(participants.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1b: Share-based splits always sum to totalPaise with exactly 0 paise loss', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000_000 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            isSelf: fc.boolean(),
            shares: fc.integer({ min: 1, max: 100 })
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (totalPaise, participants) => {
          const result = calculateBillSplit(totalPaise, participants, 'shares');
          const sum = result.participants.reduce((acc, p) => acc + p.amountPaise, 0);

          expect(sum).toBe(totalPaise);
          expect(result.remainderPaise).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 2: Total Balance Conservation across Internal Transfers
  it('Property 2: Any internal transfers between accounts leave combined balance strictly unchanged (+0)', () => {
    fc.assert(
      fc.property(
        // 2 to 10 accounts with opening balances
        fc.array(
          fc.record({
            id: fc.string({ minLength: 2, maxLength: 10 }),
            openingBalancePaise: fc.integer({ min: 0, max: 10_000_000 })
          }),
          { minLength: 2, maxLength: 10 }
        ).map((rawAccounts) => {
          return rawAccounts.map((a, idx) => ({
            id: `acc-${idx}-${a.id}`,
            name: `Account ${idx}`,
            type: 'bank' as const,
            openingBalancePaise: a.openingBalancePaise,
            color: '#000',
            icon: 'Landmark',
            createdAt: '2026-10-01T00:00:00Z',
            updatedAt: '2026-10-01T00:00:00Z'
          }));
        }),
        // Sequence of internal transfers
        fc.array(
          fc.record({
            amountPaise: fc.integer({ min: 1, max: 500_000 }),
            fromIndex: fc.nat(),
            toIndex: fc.nat()
          }),
          { minLength: 0, maxLength: 30 }
        ),
        (accounts, transferSpecs) => {
          const initial = calculateAccountBalances(accounts, []);
          const initialTotal = initial.actualTotalBalancePaise;

          const transactions: Transaction[] = transferSpecs.map((spec, i) => {
            const fromAcc = accounts[spec.fromIndex % accounts.length];
            const toAcc = accounts[spec.toIndex % accounts.length];
            return {
              id: `tx-transfer-${i}`,
              type: 'transfer',
              amountPaise: spec.amountPaise,
              accountId: fromAcc.id,
              toAccountId: toAcc.id,
              categoryId: 'internal-transfer',
              date: '2026-10-05T12:00:00Z',
              merchant: 'Self Transfer',
              paymentMethod: 'upi',
              createdAt: '2026-10-05T12:00:00Z',
              updatedAt: '2026-10-05T12:00:00Z'
            };
          });

          const after = calculateAccountBalances(accounts, transactions);
          expect(after.actualTotalBalancePaise).toBe(initialTotal);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 3: Daily Limit is never negative and never exceeds available spendable cash
  it('Property 3: Daily allowance is never negative and never exceeds available cash', () => {
    fc.assert(
      fc.property(
        // available cash can be negative, zero, or positive
        fc.integer({ min: -1_000_000, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.constantFrom('conservative' as const, 'balanced' as const, 'flexible' as const),
        (availableToSpendPaise, remainingBudget, strategy) => {
          const allowance = calculateDailyAllowance({
            availableToSpendPaise,
            remainingMonthlyBudgetPaise: remainingBudget,
            strategy,
            currentDate: new Date('2026-10-15T12:00:00Z')
          });

          // Non-negativity invariant:
          expect(allowance.dailyLimitPaise).toBeGreaterThanOrEqual(0);
          expect(allowance.daysRemaining).toBeGreaterThanOrEqual(1);

          // Upper bound invariant:
          if (availableToSpendPaise <= 0) {
            expect(allowance.dailyLimitPaise).toBe(0);
          } else {
            expect(allowance.dailyLimitPaise).toBeLessThanOrEqual(availableToSpendPaise);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional Edge Case Properties:
  it('Property 4: Overcommitted calculations correctly track deficit when allocations exceed assets', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 2_000_000 }),
        (cashAssets, savingsGoalPaise) => {
          const summary = calculateMonthlySummary({
            monthKey: '2026-10',
            accounts: [
              {
                id: 'acc-1',
                name: 'Primary',
                type: 'bank',
                openingBalancePaise: cashAssets,
                color: '#000',
                icon: 'Landmark',
                createdAt: '2026-10-01T00:00:00Z',
                updatedAt: '2026-10-01T00:00:00Z'
              }
            ],
            transactions: [],
            categories: [],
            savingsGoals: [
              {
                id: 'goal-1',
                name: 'Test Goal',
                targetAmountPaise: 5_000_000,
                currentAmountPaise: savingsGoalPaise,
                priority: 'medium',
                icon: 'Target',
                color: '#000',
                history: [],
                createdAt: '2026-10-01T00:00:00Z',
                updatedAt: '2026-10-01T00:00:00Z'
              }
            ],
            debts: [],
            recurringRules: []
          });

          if (cashAssets < savingsGoalPaise) {
            expect(summary.isOvercommitted).toBe(true);
            expect(summary.overcommittedPaise).toBe(savingsGoalPaise - cashAssets);
            expect(summary.availableToSpendPaise).toBe(0);
          } else {
            expect(summary.isOvercommitted).toBe(false);
            expect(summary.overcommittedPaise).toBe(0);
            expect(summary.availableToSpendPaise).toBe(cashAssets - savingsGoalPaise);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: Savings rate with zero or negative income is strictly 0% (no NaN / division by zero)', () => {
    const summary = calculateMonthlySummary({
      monthKey: '2026-10',
      accounts: [],
      transactions: [],
      categories: [],
      savingsGoals: [],
      debts: [],
      recurringRules: []
    });

    expect(summary.savingsRatePercentage).toBe(0);
    expect(Number.isNaN(summary.savingsRatePercentage)).toBe(false);
  });

  it('Property 6: Custom ₹ split rejects discrepancies when sum does not equal total', () => {
    const participants = [
      { id: '1', name: 'You', isSelf: true, exactPaise: 3000 },
      { id: '2', name: 'Aman', isSelf: false, exactPaise: 4000 }
    ];

    // Total is 10000 paise (₹100), but allocated is 7000 paise (₹70) => remainder is 3000
    const result = calculateBillSplit(10000, participants, 'exact');
    expect(result.remainderPaise).toBe(3000);

    const settlement = buildSplitSettlement({
      billTitle: 'Dinner',
      totalPaise: 10000,
      payerName: 'You',
      isPayerSelf: true,
      participants: result.participants
    });
    expect(settlement.isValid).toBe(false);
    expect(settlement.discrepancyPaise).toBe(3000);
  });
});
