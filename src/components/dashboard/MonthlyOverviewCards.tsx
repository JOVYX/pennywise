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
      <div className="grid grid-cols-3 gap-2">
        {/* Income Card */}
        <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-1 text-emerald-400 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Income
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold text-white truncate tabular-nums tracking-tight">
            {formatINR(financialSummary.totalIncomeReceivedThisMonthPaise, {
              showPaise: false
            })}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5">Received</span>
        </div>

        {/* Expenses Card */}
        <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-1 text-rose-400 mb-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Spent
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold text-white truncate tabular-nums tracking-tight">
            {formatINR(financialSummary.totalExpensesThisMonthPaise, {
              showPaise: false
            })}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5">This Month</span>
        </div>

        {/* Savings Rate Card */}
        <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-1 text-zinc-300 mb-1">
            <PiggyBank className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Saved
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums tracking-tight">
            {financialSummary.savingsRatePercentage}%
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5">Net Rate</span>
        </div>
      </div>

      {/* Budget Utilization Card */}
      <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <Target className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold text-white">Monthly Target</span>
          </div>
          {currentBudget?.overallLimitPaise ? (
            <span className="text-xs font-semibold text-zinc-300 tabular-nums">
              {budgetPct}% spent
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedTab('budgets')}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              + Set Target
            </button>
          )}
        </div>

        {currentBudget?.overallLimitPaise ? (
          <div>
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-2">
              <div
                className={`h-full ${progressColor} transition-all duration-300`}
                style={{ width: `${Math.min(100, budgetPct)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span>
                Spent:{' '}
                <strong className="text-white">
                  {formatINR(financialSummary.totalExpensesThisMonthPaise)}
                </strong>
              </span>
              <span>
                Limit:{' '}
                <strong className="text-zinc-300">
                  {formatINR(currentBudget.overallLimitPaise)}
                </strong>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-zinc-400">
            No monthly limit configured for this month. Set a budget to track spending pace.
          </p>
        )}
      </div>
    </div>
  );
};
