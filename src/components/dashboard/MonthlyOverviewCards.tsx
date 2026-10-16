import React from 'react';
import { ArrowDownRight, ArrowUpRight, PiggyBank, Target } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/formatters';

export const MonthlyOverviewCards: React.FC = () => {
  const { financialSummary, currentBudget, setSelectedTab } = useApp();

  const budgetPct = currentBudget?.overallLimitPaise
    ? Math.round(
        (financialSummary.totalExpensesThisMonthPaise / currentBudget.overallLimitPaise) * 100
      )
    : 0;

  let progressColor = 'bg-emerald-500';
  if (budgetPct >= 85) {
    progressColor = 'bg-rose-500';
  } else if (budgetPct >= 70) {
    progressColor = 'bg-amber-500';
  }

  return (
    <div className="space-y-3">
      {/* 3 Metric Cards Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Income Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-1 text-emerald-400 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Income
            </span>
          </div>
          <div className="text-sm sm:text-base font-extrabold text-white truncate tabular-nums">
            {formatINR(financialSummary.totalIncomeReceivedThisMonthPaise, {
              showPaise: false
            })}
          </div>
          <span className="text-[9px] text-neutral-500 mt-0.5">Received</span>
        </div>

        {/* Expenses Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-1 text-rose-400 mb-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Spent
            </span>
          </div>
          <div className="text-sm sm:text-base font-extrabold text-white truncate tabular-nums">
            {formatINR(financialSummary.totalExpensesThisMonthPaise, {
              showPaise: false
            })}
          </div>
          <span className="text-[9px] text-neutral-500 mt-0.5">This Month</span>
        </div>

        {/* Savings Rate Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-1 text-teal-400 mb-1">
            <PiggyBank className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Saved
            </span>
          </div>
          <div className="text-sm sm:text-base font-extrabold text-teal-400 tabular-nums">
            {financialSummary.savingsRatePercentage}%
          </div>
          <span className="text-[9px] text-neutral-500 mt-0.5">Savings Rate</span>
        </div>
      </div>

      {/* Budget Utilization Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">Monthly Budget</span>
          </div>
          {currentBudget?.overallLimitPaise ? (
            <span className="text-xs font-bold text-neutral-300 tabular-nums">
              {budgetPct}% spent
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedTab('budgets')}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              + Set Budget
            </button>
          )}
        </div>

        {currentBudget?.overallLimitPaise ? (
          <div>
            <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 mb-2">
              <div
                className={`h-full ${progressColor} transition-all duration-300`}
                style={{ width: `${Math.min(100, budgetPct)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-neutral-400">
              <span>
                Spent:{' '}
                <strong className="text-white">
                  {formatINR(financialSummary.totalExpensesThisMonthPaise)}
                </strong>
              </span>
              <span>
                Limit:{' '}
                <strong className="text-neutral-300">
                  {formatINR(currentBudget.overallLimitPaise)}
                </strong>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-neutral-400">
            No monthly limit configured for this month. Set a budget to track spending pace.
          </p>
        )}
      </div>
    </div>
  );
};
