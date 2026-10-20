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
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-sm relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#161e2e] border border-[#28354b] flex items-center justify-center text-amber-400">
            <Target className="w-3.5 h-3.5" />
          </div>
          <span className="mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
            DAILY SPENDING ASSISTANT
          </span>
        </div>
        <div className="flex items-center space-x-1.5 mono text-[11px] font-semibold text-slate-300 bg-[#161e2e] px-2.5 py-1 rounded border border-[#28354b]">
          <Calendar className="w-3 h-3 text-amber-400" />
          <span>{allowance.daysRemaining}d to stipend</span>
        </div>
      </div>

      {/* Hero Allowance Gauge */}
      <div className="bg-[#0b0f17] border border-[#1f293d] rounded-xl p-3.5 mb-3 flex items-center justify-between">
        <div>
          <div className="mono text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            ALLOWANCE TODAY
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="mono text-3xl font-extrabold text-amber-400 tabular-nums tracking-tight">
              {formatINR(allowance.dailyLimitPaise, { showPaise: false })}
            </span>
            <span className="mono text-xs font-semibold text-slate-400">/ day</span>
          </div>
        </div>

        {/* Strategy Selector Segmented Control */}
        <div className="flex flex-col items-end">
          <span className="mono text-[9px] uppercase font-bold text-slate-500 mb-1">CUSHION</span>
          <div className="flex items-center bg-[#0b0f17] p-0.5 rounded border border-[#1f293d] text-[10px] mono font-semibold">
            {(['conservative', 'balanced', 'flexible'] as BudgetAllowanceStrategy[]).map((strat) => (
              <button
                key={strat}
                type="button"
                onClick={() => handleStrategyChange(strat)}
                className={`px-2 py-1 rounded capitalize transition-all ${
                  settings.dailyAllowanceStrategy === strat
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {strat === 'conservative' ? 'Safe' : strat === 'balanced' ? 'Bal' : 'Flex'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        {allowance.explanation}
      </p>
    </div>
  );
};
