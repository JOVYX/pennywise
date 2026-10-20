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
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-1 text-emerald-400 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="mono text-[9px] font-bold uppercase tracking-wider text-slate-400">
              INCOME
            </span>
          </div>
          <div className="mono text-sm sm:text-base font-bold text-white truncate tabular-nums tracking-tight">
            {formatINR(financialSummary.totalIncomeReceivedThisMonthPaise, {
              showPaise: false
            })}
          </div>
          <span className="mono text-[10px] text-slate-500 mt-0.5">Received</span>
        </div>

        {/* Expenses Card */}
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-1 text-rose-400 mb-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span className="mono text-[9px] font-bold uppercase tracking-wider text-slate-400">
              EXPENSE
            </span>
          </div>
          <div className="mono text-sm sm:text-base font-bold text-white truncate tabular-nums tracking-tight">
            {formatINR(financialSummary.totalExpensesThisMonthPaise, {
              showPaise: false
            })}
          </div>
          <span className="mono text-[10px] text-slate-500 mt-0.5">Dispatched</span>
        </div>

        {/* Savings Rate Card */}
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-1 text-amber-400 mb-1">
            <PiggyBank className="w-3.5 h-3.5" />
            <span className="mono text-[9px] font-bold uppercase tracking-wider text-slate-400">
              SAVINGS
            </span>
          </div>
          <div className="mono text-sm sm:text-base font-bold text-emerald-400 tabular-nums tracking-tight">
            {financialSummary.savingsRatePercentage}%
          </div>
          <span className="mono text-[10px] text-slate-500 mt-0.5">Retained</span>
        </div>
      </div>

      {/* Budget Utilization Card */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <Target className="w-4 h-4 text-amber-400" />
            <span className="mono text-xs font-bold text-white uppercase tracking-wider">MONTHLY BUDGET CONSUMPTION</span>
          </div>
          {currentBudget?.overallLimitPaise ? (
            <span className="mono text-xs font-bold text-slate-300 tabular-nums">
              {budgetPct}%
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedTab('budgets')}
              className="mono text-xs font-bold text-amber-400 hover:underline"
            >
              + SET CAP
            </button>
          )}
        </div>

        {currentBudget?.overallLimitPaise ? (
          <div>
            <div className="w-full h-2 bg-[#0b0f17] border border-[#1f293d] rounded-full overflow-hidden mb-2">
              <div
                className={`h-full ${progressColor} transition-all duration-300`}
                style={{ width: `${Math.min(100, budgetPct)}%` }}
              />
            </div>
            <div className="flex justify-between items-center mono text-[11px] text-slate-400">
              <span>
                Spent:{' '}
                <strong className="text-white">
                  {formatINR(financialSummary.totalExpensesThisMonthPaise)}
                </strong>
              </span>
              <span>
                Cap:{' '}
                <strong className="text-slate-300">
                  {formatINR(currentBudget.overallLimitPaise)}
                </strong>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            No spending cap configured for this month. Set a budget ceiling to monitor burnout pace.
          </p>
        )}
      </div>
    </div>
  );
};
