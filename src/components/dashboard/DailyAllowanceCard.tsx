import React from 'react';
import { Target, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calculateDailyAllowance } from '../../utils/finance';
import { formatINR } from '../../utils/formatters';
import { BudgetAllowanceStrategy } from '../../types';

export const DailyAllowanceCard: React.FC = () => {
  const { financialSummary, settings, updateSettings, currentBudget } = useApp();

  const allowance = calculateDailyAllowance({
    availableToSpendPaise: financialSummary.availableToSpendPaise,
    remainingMonthlyBudgetPaise: currentBudget?.overallLimitPaise
      ? financialSummary.remainingMonthlyBudgetPaise
      : undefined,
    nextExpectedIncomeDate: settings.nextExpectedIncomeDate,
    strategy: settings.dailyAllowanceStrategy
  });

  const handleStrategyChange = (newStrategy: BudgetAllowanceStrategy) => {
    updateSettings({ dailyAllowanceStrategy: newStrategy });
  };

  return (
    <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-300">
            <Target className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Daily Spending Assistant
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px] font-medium text-zinc-400 bg-white/[0.04] px-2.5 py-0.8 rounded-full border border-white/[0.06]">
          <Calendar className="w-3 h-3 text-zinc-400" />
          <span>{allowance.daysRemaining} days remaining</span>
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <div>
          <span className="text-3xl font-bold text-white tabular-nums tracking-tight">
            {formatINR(allowance.dailyLimitPaise, { showPaise: false })}
          </span>
          <span className="text-xs font-normal text-zinc-400 ml-1.5">/ day</span>
        </div>

        {/* Strategy Selector Pills */}
        <div className="flex items-center bg-black/60 p-0.5 rounded-xl border border-white/[0.07] text-[10px] font-medium">
          {(['conservative', 'balanced', 'flexible'] as BudgetAllowanceStrategy[]).map((strat) => (
            <button
              key={strat}
              type="button"
              onClick={() => handleStrategyChange(strat)}
              className={`px-2 py-0.8 rounded-lg capitalize transition-all ${
                settings.dailyAllowanceStrategy === strat
                  ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {strat === 'conservative' ? 'Safe' : strat === 'balanced' ? 'Balanced' : 'Flex'}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed mt-1">
        {allowance.explanation}
      </p>
    </div>
  );
};
