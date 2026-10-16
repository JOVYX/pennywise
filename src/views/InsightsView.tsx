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
      <div className="flex justify-between items-center bg-neutral-900 p-1 rounded-2xl border border-neutral-800 text-xs font-semibold">
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
                ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Income vs Expense Bar Chart */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Income vs Expenses
          </h3>
          <span className="text-xs font-extrabold text-emerald-400 tabular-nums">
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
              <XAxis dataKey="name" stroke="#a3a3a3" fontSize={11} tickLine={false} />
              <YAxis stroke="#a3a3a3" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                formatter={(val: any) => [`₹${val}`, 'Amount']}
                contentStyle={{
                  backgroundColor: '#171717',
                  border: '1px solid #262626',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown Donut / Pie */}
      {categoryData.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
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
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${val}`, 'Spent']}
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #262626',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Top List */}
          <div className="space-y-2 mt-2 pt-2 border-t border-neutral-800">
            {categoryData.slice(0, 4).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-neutral-300 font-medium truncate max-w-[150px]">
                    {cat.name}
                  </span>
                </div>
                <span className="font-bold text-white tabular-nums">
                  ₹{cat.value.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Spending Trend Area */}
      {dailyTrendData.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
            Daily Spending Trend
          </h3>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stop-color="#10b981" stop-opacity={0.3} />
                    <stop offset="95%" stop-color="#10b981" stop-opacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#a3a3a3" fontSize={10} tickLine={false} />
                <YAxis stroke="#a3a3a3" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val: any) => [`₹${val}`, 'Spent']}
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #262626',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10b981"
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Actionable Ways to Save
          </h3>
        </div>

        {insights.length === 0 ? (
          <p className="text-xs text-neutral-400">
            Log more daily transactions to discover automated savings tips tailored to your spending!
          </p>
        ) : (
          <div className="space-y-2.5">
            {insights.map((tip) => (
              <div
                key={tip.id}
                className="p-3 bg-neutral-950/70 border border-neutral-800/80 rounded-2xl"
              >
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-bold text-white">{tip.title}</h4>
                  {tip.estimatedMonthlySavingsPaise && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
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
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
            Largest Expenses
          </h3>
          <div className="divide-y divide-neutral-800/70">
            {largestExpenses.map((tx) => (
              <div key={tx.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white truncate max-w-[170px]">{tx.merchant}</div>
                  <div className="text-[10px] text-neutral-400">{tx.date.slice(0, 10)}</div>
                </div>
                <span className="font-extrabold text-white tabular-nums">
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
