import React, { useState } from 'react';
import {
  PieChart,
  PiggyBank,
  CreditCard,
  CalendarClock,
  Plus,
  AlertTriangle,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { formatINR, rupeesToPaise } from '../utils/formatters';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { db } from '../db';
import { GoalPriority, RecurringFrequency } from '../types';

export const BudgetsView: React.FC = () => {
  const {
    currentMonth,
    currentBudget,
    financialSummary,
    categories,
    savingsGoals,
    debts,
    recurringRules,
    accounts,
    updateSavingsGoalAllocation,
    recordDebtPayment,
    markRecurringProcessed
  } = useApp();

  const [activeSection, setActiveSection] = useState<'budget' | 'goals' | 'debts' | 'recurring'>('budget');

  // Modals
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [budgetInputStr, setBudgetInputStr] = useState(
    currentBudget?.overallLimitPaise ? (currentBudget.overallLimitPaise / 100).toString() : '15000'
  );
  const [categoryLimitsState, setCategoryLimitsState] = useState<Record<string, string>>(
    () => {
      const res: Record<string, string> = {};
      if (currentBudget?.categoryLimits) {
        for (const [k, v] of Object.entries(currentBudget.categoryLimits)) {
          res[k] = (v / 100).toString();
        }
      }
      return res;
    }
  );

  // Goal modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [goalPriority, setGoalPriority] = useState<GoalPriority>('medium');

  // Allocation modal
  const [allocatingGoalId, setAllocatingGoalId] = useState<string | null>(null);
  const [allocAmountStr, setAllocAmountStr] = useState('');
  const [allocType, setAllocType] = useState<'deposit' | 'withdrawal'>('deposit');

  // Debt payment modal
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [debtPayAmountStr, setDebtPayAmountStr] = useState('');
  const [debtPayAccountId, setDebtPayAccountId] = useState(accounts[0]?.id || '');

  // Add Debt Modal
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtLender, setNewDebtLender] = useState('');
  const [newDebtAmountStr, setNewDebtAmountStr] = useState('');
  const [newDebtDueDate, setNewDebtDueDate] = useState('');

  // Add Recurring Rule Modal
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [recName, setRecName] = useState('');
  const [recAmountStr, setRecAmountStr] = useState('');
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>('monthly');
  const [recNextDueDate, setRecNextDueDate] = useState('');
  const [recCategoryId, setRecCategoryId] = useState('subscriptions');

  // Save budget handler
  const handleSaveBudget = async () => {
    const overallLimit = rupeesToPaise(budgetInputStr);
    const catLimitsPaise: Record<string, number> = {};
    for (const [catId, val] of Object.entries(categoryLimitsState)) {
      const p = rupeesToPaise(val);
      if (p > 0) catLimitsPaise[catId] = p;
    }

    await db.budgets.put({
      month: currentMonth,
      overallLimitPaise: overallLimit,
      categoryLimits: catLimitsPaise,
      warningThresholds: [70, 85, 100]
    });
    setIsEditBudgetOpen(false);
  };

  // Add goal handler
  const handleAddGoal = async () => {
    const target = rupeesToPaise(goalTargetStr);
    if (!goalName.trim() || target <= 0) return;

    await db.savingsGoals.put({
      id: `goal-${Date.now()}`,
      name: goalName.trim(),
      targetAmountPaise: target,
      currentAmountPaise: 0,
      targetDate: goalDate || undefined,
      priority: goalPriority,
      icon: 'ShieldCheck',
      color: '#10b981',
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setIsGoalModalOpen(false);
    setGoalName('');
    setGoalTargetStr('');
  };

  // Handle allocation submission
  const handleAllocationSubmit = async () => {
    if (!allocatingGoalId) return;
    const amount = rupeesToPaise(allocAmountStr);
    if (amount <= 0) return;

    await updateSavingsGoalAllocation({
      goalId: allocatingGoalId,
      amountPaise: amount,
      type: allocType,
      note: allocType === 'deposit' ? 'Manual savings allocation' : 'Savings withdrawal'
    });

    const updatedGoal = savingsGoals.find((g) => g.id === allocatingGoalId);
    if (updatedGoal && allocType === 'deposit') {
      const newTotal = updatedGoal.currentAmountPaise + amount;
      if (newTotal >= updatedGoal.targetAmountPaise) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }

    setAllocatingGoalId(null);
    setAllocAmountStr('');
  };

  // Handle debt payment
  const handleDebtPaymentSubmit = async () => {
    if (!payingDebtId) return;
    const amount = rupeesToPaise(debtPayAmountStr);
    if (amount <= 0 || !debtPayAccountId) return;

    await recordDebtPayment({
      debtId: payingDebtId,
      amountPaise: amount,
      accountId: debtPayAccountId
    });

    setPayingDebtId(null);
    setDebtPayAmountStr('');
  };

  // Add Debt submit
  const handleAddDebtSubmit = async () => {
    const amount = rupeesToPaise(newDebtAmountStr);
    if (!newDebtName.trim() || amount <= 0) return;

    await db.debts.put({
      id: `debt-${Date.now()}`,
      name: newDebtName.trim(),
      lender: newDebtLender.trim() || 'Lender',
      type: 'personal_debt',
      originalAmountPaise: amount,
      currentBalancePaise: amount,
      minimumPaymentPaise: amount,
      dueDate: newDebtDueDate || undefined,
      payments: [],
      isPaidOff: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setIsAddDebtOpen(false);
    setNewDebtName('');
    setNewDebtLender('');
    setNewDebtAmountStr('');
    setNewDebtDueDate('');
  };

  // Add Recurring submit
  const handleAddRecurringSubmit = async () => {
    const amount = rupeesToPaise(recAmountStr);
    if (!recName.trim() || amount <= 0 || !recNextDueDate) return;

    await db.recurringRules.put({
      id: `rec-${Date.now()}`,
      type: 'expense',
      name: recName.trim(),
      amountPaise: amount,
      accountId: accounts[0]?.id || 'acc-primary-bank',
      categoryId: recCategoryId,
      frequency: recFrequency,
      nextDueDate: recNextDueDate,
      isActive: true,
      paymentMethod: 'upi',
      merchant: recName.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setIsAddRecurringOpen(false);
    setRecName('');
    setRecAmountStr('');
    setRecNextDueDate('');
  };

  return (
    <div className="space-y-4 px-4 py-3 max-w-md mx-auto">
      {/* Segmented Section Picker */}
      <div className="grid grid-cols-4 gap-1 bg-neutral-900 p-1 rounded-2xl border border-neutral-800">
        {[
          { id: 'budget', label: 'Budget', icon: PieChart },
          { id: 'goals', label: 'Goals', icon: PiggyBank },
          { id: 'debts', label: 'Debts', icon: CreditCard },
          { id: 'recurring', label: 'Bills', icon: CalendarClock }
        ].map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id as any)}
              className={`flex flex-col items-center justify-center py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-1" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: BUDGET */}
      {activeSection === 'budget' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Planning Workflow Summary */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Monthly Spending Allowance
              </h3>
              <button
                type="button"
                onClick={() => setIsEditBudgetOpen(true)}
                className="text-xs font-bold text-emerald-400 hover:underline"
              >
                Configure Budget
              </button>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
                  {formatINR(financialSummary.remainingMonthlyBudgetPaise)}
                </span>
                <span className="text-xs font-medium text-neutral-400 ml-1.5">
                  remaining of {formatINR(currentBudget?.overallLimitPaise || 0)}
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  financialSummary.budgetUtilizationPercentage > 85
                    ? 'bg-rose-500/20 text-rose-400'
                    : financialSummary.budgetUtilizationPercentage > 70
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {financialSummary.budgetUtilizationPercentage}% spent
              </span>
            </div>

            {/* Overspending Shortfall Warning */}
            {currentBudget?.overallLimitPaise &&
              currentBudget.overallLimitPaise > financialSummary.actualTotalBalancePaise && (
                <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <strong className="block font-bold">Budget Shortfall Warning</strong>
                    Your planned budget ({formatINR(currentBudget.overallLimitPaise)}) exceeds your
                    confirmed cash balance ({formatINR(financialSummary.actualTotalBalancePaise)})
                    by{' '}
                    {formatINR(
                      currentBudget.overallLimitPaise - financialSummary.actualTotalBalancePaise
                    )}
                    . Consider lowering discretionary categories.
                  </div>
                </div>
              )}
          </div>

          {/* Category Budget Breakdown */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Category Limits & Spending
            </h4>

            <div className="space-y-3">
              {categories
                .filter((c) => c.type === 'expense')
                .map((cat) => {
                  const limit = currentBudget?.categoryLimits?.[cat.id] || cat.monthlyLimitPaise || 0;
                  return (
                    <div key={cat.id} className="p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-2xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                          >
                            <CategoryIcon name={cat.icon} size={14} />
                          </div>
                          <span className="text-xs font-bold text-white">{cat.name}</span>
                        </div>
                        {limit > 0 ? (
                          <span className="text-xs font-semibold text-neutral-300 tabular-nums">
                            Limit: {formatINR(limit)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500">No limit</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SAVINGS GOALS */}
      {activeSection === 'goals' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Savings & Emergency Funds
            </h3>
            <button
              type="button"
              onClick={() => setIsGoalModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-neutral-950 font-bold text-xs flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Goal
            </button>
          </div>

          <div className="space-y-3">
            {savingsGoals.map((goal) => {
              const pct = Math.min(
                100,
                Math.round((goal.currentAmountPaise / goal.targetAmountPaise) * 100)
              );

              return (
                <div
                  key={goal.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: `${goal.color}25`, color: goal.color }}
                      >
                        <CategoryIcon name={goal.icon} size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{goal.name}</h4>
                        <div className="text-[10px] text-neutral-400">
                          Priority: <span className="capitalize text-emerald-400">{goal.priority}</span>
                          {goal.targetDate && ` • Target: ${goal.targetDate}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-emerald-400 tabular-nums">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">
                      Saved:{' '}
                      <strong className="text-white tabular-nums">
                        {formatINR(goal.currentAmountPaise)}
                      </strong>
                    </span>
                    <span className="text-neutral-400">
                      Target:{' '}
                      <strong className="text-neutral-200 tabular-nums">
                        {formatINR(goal.targetAmountPaise)}
                      </strong>
                    </span>
                  </div>

                  {/* Allocate / Withdraw Action */}
                  <div className="pt-2 border-t border-neutral-800/70 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAllocatingGoalId(goal.id);
                        setAllocType('deposit');
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs transition-all"
                    >
                      + Allocate Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAllocatingGoalId(goal.id);
                        setAllocType('withdrawal');
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-all"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: DEBT & LIABILITIES */}
      {activeSection === 'debts' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Debts & Repayments
            </h3>
            <button
              type="button"
              onClick={() => setIsAddDebtOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Debt
            </button>
          </div>

          <div className="space-y-3">
            {debts.map((debt) => (
              <div
                key={debt.id}
                className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{debt.name}</h4>
                    <span className="text-[10px] text-neutral-400">
                      Lender: {debt.lender} {debt.dueDate && `• Due: ${debt.dueDate}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-rose-400 tabular-nums block">
                      {formatINR(debt.currentBalancePaise)}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Orig: {formatINR(debt.originalAmountPaise)}
                    </span>
                  </div>
                </div>

                {debt.payments && debt.payments.length > 0 && (
                  <div className="p-2 rounded-xl bg-neutral-950 text-[10px] text-neutral-400">
                    Latest Payment: {formatINR(debt.payments[debt.payments.length - 1].amountPaise)} on{' '}
                    {debt.payments[debt.payments.length - 1].date.slice(0, 10)}
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-800/70">
                  <button
                    type="button"
                    onClick={() => {
                      setPayingDebtId(debt.id);
                      setDebtPayAmountStr((debt.currentBalancePaise / 100).toString());
                    }}
                    className="w-full py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500 text-blue-300 hover:text-white font-bold text-xs transition-all"
                  >
                    Record Repayment
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: RECURRING BILLS */}
      {activeSection === 'recurring' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Recurring Bills & Subscriptions
            </h3>
            <button
              type="button"
              onClick={() => setIsAddRecurringOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-neutral-950 font-bold text-xs flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Recurring
            </button>
          </div>

          <div className="space-y-2.5">
            {recurringRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">{rule.name}</h4>
                  <div className="text-[10px] text-neutral-400">
                    Due {rule.nextDueDate} • {rule.frequency}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white tabular-nums">
                    {formatINR(rule.amountPaise)}
                  </span>
                  <button
                    type="button"
                    onClick={() => markRecurringProcessed(rule.id, { recordTx: true })}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold text-[11px] hover:bg-emerald-500 hover:text-neutral-950 transition-all"
                  >
                    Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Configure Budget */}
      {isEditBudgetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">Monthly Spending Budget</h3>
              <button
                type="button"
                onClick={() => setIsEditBudgetOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Overall Monthly Limit (₹)
              </label>
              <input
                type="number"
                value={budgetInputStr}
                onChange={(e) => setBudgetInputStr(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Limits */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                Category Limits (Optional)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {categories.filter((c) => c.type === 'expense').slice(0, 6).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-neutral-400 truncate max-w-[120px]">{c.name}</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={categoryLimitsState[c.id] || ''}
                      onChange={(e) =>
                        setCategoryLimitsState((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      className="w-24 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-white text-right focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditBudgetOpen(false)}
                className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBudget}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-bold"
              >
                Save Budget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Savings Goal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">New Savings Goal</h3>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Goal Name</label>
              <input
                type="text"
                placeholder="e.g. Laptop Upgrade, Emergency Fund"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Target Amount (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={goalTargetStr}
                onChange={(e) => setGoalTargetStr(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Priority</label>
              <select
                value={goalPriority}
                onChange={(e) => setGoalPriority(e.target.value as GoalPriority)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Target Date (Optional)
              </label>
              <input
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddGoal}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-bold"
              >
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Allocate to Goal */}
      {allocatingGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white capitalize">
                {allocType} Savings Allocation
              </h3>
              <button
                type="button"
                onClick={() => setAllocatingGoalId(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Amount in Rupees (₹)
              </label>
              <input
                type="number"
                autoFocus
                placeholder="0"
                value={allocAmountStr}
                onChange={(e) => setAllocAmountStr(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>

            <p className="text-[11px] text-neutral-400 leading-normal">
              Note: This reserves a portion of your existing cash for your goal. It is not an
              external expense and does not reduce your total bank balance.
            </p>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setAllocatingGoalId(null)}
                className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAllocationSubmit}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-bold"
              >
                Confirm {allocType}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Debt Payment */}
      {payingDebtId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">Record Debt Repayment</h3>
              <button
                type="button"
                onClick={() => setPayingDebtId(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Payment Amount (₹)
              </label>
              <input
                type="number"
                value={debtPayAmountStr}
                onChange={(e) => setDebtPayAmountStr(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Paid From Account
              </label>
              <select
                value={debtPayAccountId}
                onChange={(e) => setDebtPayAccountId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setPayingDebtId(null)}
                className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDebtPaymentSubmit}
                className="flex-1 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Debt */}
      {isAddDebtOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">Track New Debt / Loan</h3>
              <button
                type="button"
                onClick={() => setIsAddDebtOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Description</label>
              <input
                type="text"
                placeholder="e.g. Roommate Split, Laptop EMI"
                value={newDebtName}
                onChange={(e) => setNewDebtName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Lender / Friend</label>
              <input
                type="text"
                placeholder="e.g. Rohan, HDFC Bank, Slice"
                value={newDebtLender}
                onChange={(e) => setNewDebtLender(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Amount (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={newDebtAmountStr}
                onChange={(e) => setNewDebtAmountStr(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Due Date</label>
              <input
                type="date"
                value={newDebtDueDate}
                onChange={(e) => setNewDebtDueDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddDebtOpen(false)}
                className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDebtSubmit}
                className="flex-1 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold"
              >
                Save Debt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Recurring */}
      {isAddRecurringOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">Add Recurring Bill</h3>
              <button
                type="button"
                onClick={() => setIsAddRecurringOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Bill Name</label>
              <input
                type="text"
                placeholder="e.g. PG Rent, Spotify, Mobile Pack"
                value={recName}
                onChange={(e) => setRecName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Amount (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={recAmountStr}
                onChange={(e) => setRecAmountStr(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Frequency</label>
              <select
                value={recFrequency}
                onChange={(e) => setRecFrequency(e.target.value as RecurringFrequency)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Category</label>
              <select
                value={recCategoryId}
                onChange={(e) => setRecCategoryId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                {categories.filter((c) => c.type === 'expense').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">Next Due Date</label>
              <input
                type="date"
                value={recNextDueDate}
                onChange={(e) => setRecNextDueDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddRecurringOpen(false)}
                className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddRecurringSubmit}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-bold"
              >
                Save Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
