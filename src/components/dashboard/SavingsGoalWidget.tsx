import React from 'react';
import { PiggyBank, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';

export const SavingsGoalWidget: React.FC = () => {
  const { savingsGoals, setSelectedTab } = useApp();

  if (savingsGoals.length === 0) return null;

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center space-x-2">
          <PiggyBank className="w-4 h-4 text-amber-400" />
          <h3 className="mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
            SAVINGS GOAL RESERVATIONS
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setSelectedTab('budgets')}
          className="mono text-[11px] font-semibold text-slate-400 flex items-center hover:text-white transition-colors gap-0.5"
        >
          <span>ALL</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2.5">
        {savingsGoals.slice(0, 2).map((goal) => {
          const pct = Math.min(
            100,
            Math.round((goal.currentAmountPaise / goal.targetAmountPaise) * 100)
          );

          return (
            <div
              key={goal.id}
              className="p-3.5 rounded-lg bg-[#161e2e] border border-[#28354b]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2.5">
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center text-white"
                    style={{ backgroundColor: `${goal.color}25`, color: goal.color }}
                  >
                    <CategoryIcon name={goal.icon} size={15} />
                  </div>
                  <span className="text-[13px] font-bold text-white truncate max-w-[150px] tracking-tight">
                    {goal.name}
                  </span>
                </div>
                <span className="mono text-xs font-bold text-emerald-400 tabular-nums">
                  {pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-[#0b0f17] border border-[#1f293d] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex justify-between items-center mono text-[11px] text-slate-400">
                <span>
                  Locked: <strong className="text-white font-bold tabular-nums">{formatINR(goal.currentAmountPaise)}</strong>
                </span>
                <span className="tabular-nums">
                  Target: {formatINR(goal.targetAmountPaise)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
