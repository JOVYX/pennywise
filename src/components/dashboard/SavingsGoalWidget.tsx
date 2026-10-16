import React from 'react';
import { PiggyBank, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';

export const SavingsGoalWidget: React.FC = () => {
  const { savingsGoals, setSelectedTab } = useApp();

  if (savingsGoals.length === 0) return null;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <PiggyBank className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Savings Goals
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setSelectedTab('budgets')}
          className="text-xs font-semibold text-emerald-400 flex items-center hover:underline"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {savingsGoals.slice(0, 2).map((goal) => {
          const pct = Math.min(
            100,
            Math.round((goal.currentAmountPaise / goal.targetAmountPaise) * 100)
          );

          return (
            <div
              key={goal.id}
              className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800/80"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: `${goal.color}25`, color: goal.color }}
                  >
                    <CategoryIcon name={goal.icon} size={15} />
                  </div>
                  <span className="text-xs font-bold text-white truncate max-w-[150px]">
                    {goal.name}
                  </span>
                </div>
                <span className="text-xs font-extrabold text-emerald-400 tabular-nums">
                  {pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-neutral-400">
                <span>
                  Saved: <strong className="text-white">{formatINR(goal.currentAmountPaise)}</strong>
                </span>
                <span>
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
