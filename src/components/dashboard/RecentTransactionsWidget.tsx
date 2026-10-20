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
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <ReceiptText className="w-4 h-4 text-amber-400" />
          <h3 className="mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
            RECENT TRANSACTIONS
          </h3>
        </div>
        {transactions.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedTab('transactions')}
            className="mono text-[11px] font-semibold text-slate-400 hover:text-white flex items-center transition-colors"
          >
            <span>ENTRIES ({transactions.length})</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="p-6 text-center rounded-lg bg-[#161e2e] border border-[#28354b]">
          <div className="w-10 h-10 rounded bg-[#0b0f17] border border-[#1f293d] text-slate-400 flex items-center justify-center mx-auto mb-2.5">
            <ReceiptText className="w-5 h-5 text-amber-400" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">Journal Empty</h4>
          <p className="text-xs text-slate-400 mb-3.5 max-w-xs mx-auto">
            Log campus tapri chai, mess dues, split bills, or load student demonstration data.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setIsAddTxOpen(true);
              }}
              className="px-3.5 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              + Record Expense
            </button>
            <button
              type="button"
              onClick={() => seedSampleData()}
              className="px-3.5 py-2 rounded bg-[#111827] text-slate-300 font-semibold text-xs border border-[#1f293d] hover:bg-[#1f293d] transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Load Demo Ledger
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#1f293d]">
          {recent.map((tx) => {
            const cat = categoryMap.get(tx.categoryId);
            const isExpense = tx.type === 'expense';
            const isIncome = tx.type === 'income';

            return (
              <div
                key={tx.id}
                onClick={() => handleTxClick(tx)}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-[#161e2e]/80 px-2 -mx-2 rounded transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center shrink-0 border border-[#28354b]"
                    style={{
                      backgroundColor: cat ? `${cat.color}20` : '#161e2e',
                      color: cat?.color || '#94a3b8'
                    }}
                  >
                    <CategoryIcon name={cat?.icon || 'Receipt'} size={16} />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white truncate max-w-[170px]">
                      {tx.merchant || cat?.name || 'Transaction'}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span>{formatFriendlyDate(tx.date)}</span>
                      {tx.subCategory && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="truncate max-w-[90px]">{tx.subCategory}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`mono text-xs font-bold tabular-nums ${
                      isIncome
                        ? 'text-emerald-400'
                        : isExpense
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {isIncome ? '+' : isExpense ? '-' : ''}
                    {formatINR(tx.amountPaise)}
                  </div>
                  <span className="mono text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[#161e2e] text-slate-400 border border-[#28354b]">
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
