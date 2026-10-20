import React from 'react';
import { ReceiptText, ChevronRight, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR, formatFriendlyDate } from '../../utils/formatters';
import { CategoryIcon } from '../common/CategoryIcon';
import { seedSampleData } from '../../db';

export const RecentTransactionsWidget: React.FC = () => {
  const { transactions, categories, setSelectedTab, setIsAddTxOpen, setEditingTx } = useApp();

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const recent = transactions.slice(0, 5);

  const handleTxClick = (tx: any) => {
    setEditingTx(tx);
    setIsAddTxOpen(true);
  };

  return (
    <div className="bg-[#121214] border border-white/[0.08] rounded-3xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <ReceiptText className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs font-semibold text-white tracking-tight">
            Recent Transactions
          </h3>
        </div>
        {transactions.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedTab('transactions')}
            className="text-xs font-medium text-zinc-400 hover:text-white flex items-center transition-colors"
          >
            <span>See All</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <div className="w-10 h-10 rounded-full bg-white/[0.05] text-zinc-400 flex items-center justify-center mx-auto mb-2.5">
            <ReceiptText className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">No Transactions</h4>
          <p className="text-xs text-zinc-400 mb-3.5 max-w-xs mx-auto">
            Log your daily expenses, pocket money, or load sample data.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setIsAddTxOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-400 text-black font-semibold text-xs shadow-sm hover:bg-emerald-300 transition-all active:scale-95"
            >
              + Record Expense
            </button>
            <button
              type="button"
              onClick={() => seedSampleData()}
              className="px-3.5 py-2 rounded-xl bg-white/[0.06] text-zinc-300 font-medium text-xs border border-white/[0.08] hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              Load Demo Data
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {recent.map((tx) => {
            const cat = categoryMap.get(tx.categoryId);
            const isExpense = tx.type === 'expense';
            const isIncome = tx.type === 'income';

            return (
              <div
                key={tx.id}
                onClick={() => handleTxClick(tx)}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] px-2 -mx-2 rounded-xl transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/[0.06]"
                    style={{
                      backgroundColor: cat ? `${cat.color}15` : '#1c1c1e',
                      color: cat?.color || '#a1a1aa'
                    }}
                  >
                    <CategoryIcon name={cat?.icon || 'Receipt'} size={16} />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-white truncate max-w-[170px]">
                      {tx.merchant || cat?.name || 'Transaction'}
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <span>{formatFriendlyDate(tx.date)}</span>
                      {tx.subCategory && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[90px]">{tx.subCategory}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-xs font-semibold tabular-nums ${
                      isIncome
                        ? 'text-emerald-400'
                        : isExpense
                        ? 'text-white'
                        : 'text-zinc-400'
                    }`}
                  >
                    {isIncome ? '+' : isExpense ? '-' : ''}
                    {formatINR(tx.amountPaise)}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-400">
                    {tx.paymentMethod}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
