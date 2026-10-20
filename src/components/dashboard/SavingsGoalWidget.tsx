import React from 'react';
import { PiggyBank, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';

export const SavingsGoalWidget: React.FC = () => {
  const { savingsGoals, setSelectedTab } = useApp();

  if (savingsGoals.length === 0) return null;

  return (
    <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center space-x-2">
          <PiggyBank className="w-4 h-4 text-neutral-300" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Savings Goals
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setSelectedTab('budgets')}
          className="text-[11px] font-medium text-neutral-400 flex items-center hover:text-white transition-colors gap-0.5"
        >
          <span>View All</span>
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
              className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.05] hover:border-white/[0.09] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                  >
                    <CategoryIcon name={goal.icon} size={15} />
                  </div>
                  <span className="text-[13px] font-medium text-white truncate max-w-[150px] tracking-tight">
                    {goal.name}
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                  {pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-neutral-400">
                <span>
                  Saved: <strong className="text-white font-semibold tabular-nums">{formatINR(goal.currentAmountPaise)}</strong>
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
