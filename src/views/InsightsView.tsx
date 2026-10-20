import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Lightbulb } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/formatters';
import { generateActionableInsights } from '../utils/finance';

export const InsightsView: React.FC = () => {
  const { transactions, categories, currentMonth, financialSummary, debts, recurringRules } = useApp();
  const [timeRange, setTimeRange] = useState<'this-month' | 'last-3-months' | 'all'>('this-month');

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Filter transactions based on range
  const filteredTx = useMemo(() => {
    if (timeRange === 'this-month') {
      return transactions.filter((t) => t.date.startsWith(currentMonth));
    }
    if (timeRange === 'last-3-months') {
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return transactions.filter((t) => new Date(t.date) >= threeMonthsAgo);
    }
    return transactions;
  }, [transactions, currentMonth, timeRange]);

  // Category breakdown data for Pie Chart
  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string; icon: string }> = {};

    for (const tx of filteredTx) {
      if (tx.type === 'expense') {
        const cat = categoryMap.get(tx.categoryId);
        const name = cat?.name || 'Other';
        const color = cat?.color || '#94a3b8';
        const icon = cat?.icon || 'Receipt';
        const rupees = tx.amountPaise / 100;

        if (!map[tx.categoryId]) {
          map[tx.categoryId] = { name, value: rupees, color, icon };
        } else {
          map[tx.categoryId].value += rupees;
        }
      }
    }

    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [filteredTx, categoryMap]);

  // Income vs Expense Totals
  const incomeExpenseData = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTx) {
      if (tx.type === 'income') income += tx.amountPaise / 100;
      if (tx.type === 'expense') expense += tx.amountPaise / 100;
    }
    return [
      { name: 'Income', amount: income, fill: '#10b981' },
      { name: 'Expense', amount: expense, fill: '#f43f5e' }
    ];
  }, [filteredTx]);

  // Daily Trend Data (last 14 days or days of month)
  const dailyTrendData = useMemo(() => {
    const dayMap: Record<string, number> = {};
    for (const tx of filteredTx) {
      if (tx.type === 'expense') {
        const d = tx.date.slice(8, 10);
        dayMap[d] = (dayMap[d] || 0) + tx.amountPaise / 100;
      }
    }
    return Object.keys(dayMap)
      .sort((a, b) => Number(a) - Number(b))
      .map((day) => ({
        day: `D${day}`,
        amount: dayMap[day]
      }));
  }, [filteredTx]);

  // Largest transactions
  const largestExpenses = useMemo(() => {
    return filteredTx
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amountPaise - a.amountPaise)
      .slice(0, 5);
  }, [filteredTx]);

  // Transparent rule-based insights
  const insights = useMemo(() => {
    return generateActionableInsights({
      transactions,
      categories,
      monthKey: currentMonth,
      summary: financialSummary,
      debts,
      recurringRules
    });
  }, [transactions, categories, currentMonth, financialSummary, debts, recurringRules]);

  return (
    <div className="space-y-4 px-4 py-3 max-w-md mx-auto">
      {/* Range Filter */}
      <div className="flex justify-between items-center bg-white/[0.04] p-1 rounded-2xl border border-white/[0.08] text-xs font-medium">
        {[
          { id: 'this-month', label: 'This Month' },
          { id: 'last-3-months', label: '3 Months' },
          { id: 'all', label: 'All Time' }
        ].map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setTimeRange(r.id as any)}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              timeRange === r.id
                ? 'bg-white/[0.14] text-white shadow-sm ring-1 ring-white/10 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Income vs Expense Bar Chart */}
      <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Income vs Expenses
          </h3>
          <span className="text-xs font-semibold text-emerald-400 tabular-nums">
            Net Saved: {formatINR(
              Math.max(
                0,
                financialSummary.totalIncomeReceivedThisMonthPaise -
                  financialSummary.totalExpensesThisMonthPaise
              )
            )}
          </span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeExpenseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#525252" fontSize={11} tickLine={false} />
              <YAxis stroke="#525252" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                formatter={(val: any) => [`₹${val}`, 'Amount']}
                contentStyle={{
                  backgroundColor: '#121214',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px',
                  color: '#fff',
                  fontSize: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                }}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown Donut / Pie */}
      {categoryData.length > 0 && (
        <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3.5">
            Spending By Category
          </h3>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={74}
                  paddingAngle={3}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${val}`, 'Spent']}
                  contentStyle={{
                    backgroundColor: '#121214',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '14px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Top List */}
          <div className="space-y-2 mt-2 pt-2.5 border-t border-white/[0.06]">
            {categoryData.slice(0, 4).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-neutral-300 font-medium truncate max-w-[150px]">
                    {cat.name}
                  </span>
                </div>
                <span className="font-semibold text-white tabular-nums">
                  ₹{cat.value.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Spending Trend Area */}
      {dailyTrendData.length > 0 && (
        <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3.5">
            Daily Spending Trend
          </h3>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#525252" fontSize={10} tickLine={false} />
                <YAxis stroke="#525252" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val: any) => [`₹${val}`, 'Spent']}
                  contentStyle={{
                    backgroundColor: '#121214',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '14px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#34d399"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#trendGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Actionable Ways to Save */}
      <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-3">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-4 h-4 text-neutral-300" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Actionable Ways to Save
          </h3>
        </div>

        {insights.length === 0 ? (
          <p className="text-xs text-neutral-400">
            Log more daily transactions to discover automated savings tips tailored to your spending!
          </p>
        ) : (
          <div className="space-y-2">
            {insights.map((tip) => (
              <div
                key={tip.id}
                className="p-3.5 bg-black/50 border border-white/[0.05] rounded-2xl hover:border-white/[0.09] transition-colors"
              >
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[13px] font-medium text-white tracking-tight">{tip.title}</h4>
                  {tip.estimatedMonthlySavingsPaise && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Save ~₹{Math.floor(tip.estimatedMonthlySavingsPaise / 100)}/mo
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">{tip.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Largest Transactions */}
      {largestExpenses.length > 0 && (
        <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3.5">
            Largest Expenses
          </h3>
          <div className="divide-y divide-white/[0.04]">
            {largestExpenses.map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-white truncate max-w-[170px] text-[13px] tracking-tight">{tx.merchant}</div>
                  <div className="text-[11px] text-neutral-500">{tx.date.slice(0, 10)}</div>
                </div>
                <span className="font-semibold text-white tabular-nums tracking-tight text-[13px]">
                  {formatINR(tx.amountPaise)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
