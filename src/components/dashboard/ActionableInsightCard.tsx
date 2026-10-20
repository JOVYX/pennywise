import React from 'react';
import { Lightbulb, TrendingDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateActionableInsights } from '../../utils/finance';

export const ActionableInsightCard: React.FC = () => {
  const { transactions, categories, currentMonth, financialSummary, debts, recurringRules } = useApp();

  const insights = generateActionableInsights({
    transactions,
    categories,
    monthKey: currentMonth,
    summary: financialSummary,
    debts,
    recurringRules
  });

  if (insights.length === 0) return null;

  const topInsight = insights[0];

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'opportunity':
        return <TrendingDown className="w-4 h-4 text-sky-400" />;
      default:
        return <Lightbulb className="w-4 h-4 text-amber-300" />;
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 shadow-sm flex items-start space-x-3.5">
      <div className="p-2 rounded-lg bg-[#161e2e] border border-[#28354b] shrink-0 mt-0.5">
        {getIcon(topInsight.type)}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-bold text-white tracking-tight">
            {topInsight.title}
          </h4>
          {topInsight.estimatedMonthlySavingsPaise && (
            <span className="mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Save ~₹{Math.floor(topInsight.estimatedMonthlySavingsPaise / 100)}/mo
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {topInsight.description}
        </p>
      </div>
    </div>
  );
};
