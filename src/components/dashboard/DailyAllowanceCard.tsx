import { Sparkles, Calendar } from 'lucide-react';
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
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            Daily Spending Assistant
          </span>
        </div>
        <div className="flex items-center space-x-1 text-[11px] font-semibold text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-full border border-neutral-800">
          <Calendar className="w-3 h-3 text-emerald-400" />
          <span>{allowance.daysRemaining} days left</span>
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <div>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 tabular-nums">
            {formatINR(allowance.dailyLimitPaise, { showPaise: false })}
          </span>
          <span className="text-xs font-medium text-neutral-400 ml-1.5">/ day</span>
        </div>

        {/* Strategy Selector Pills */}
        <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[10px] font-semibold">
          {(['conservative', 'balanced', 'flexible'] as BudgetAllowanceStrategy[]).map((strat) => (
            <button
              key={strat}
              type="button"
              onClick={() => handleStrategyChange(strat)}
              className={`px-2 py-0.5 rounded-lg capitalize transition-all ${
                settings.dailyAllowanceStrategy === strat
                  ? 'bg-neutral-800 text-amber-300 font-bold shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {strat === 'conservative' ? 'Safe' : strat === 'balanced' ? 'Bal' : 'Flex'}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-neutral-400 leading-relaxed">
        {allowance.explanation}
      </p>
    </div>
  );
};
