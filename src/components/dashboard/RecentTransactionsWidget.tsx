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
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <ReceiptText className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Recent Transactions
          </h3>
        </div>
        {transactions.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedTab('transactions')}
            className="text-xs font-semibold text-emerald-400 flex items-center hover:underline"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-neutral-950/60 border border-neutral-800/80">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <ReceiptText className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">No Transactions Yet</h4>
          <p className="text-xs text-neutral-400 mb-4 max-w-xs mx-auto">
            Log your daily expenses, pocket money, or load sample data to explore.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setIsAddTxOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-bold text-xs shadow-md hover:bg-emerald-400 transition-all"
            >
              + Record First Expense
            </button>
            <button
              type="button"
              onClick={() => seedSampleData()}
              className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-200 font-semibold text-xs border border-neutral-700 hover:bg-neutral-700 transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Load Sample Data
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-neutral-800/70">
          {recent.map((tx) => {
            const cat = categoryMap.get(tx.categoryId);
            const isExpense = tx.type === 'expense';
            const isIncome = tx.type === 'income';

            return (
              <div
                key={tx.id}
                onClick={() => handleTxClick(tx)}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-neutral-800/40 px-2 -mx-2 rounded-xl transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: cat ? `${cat.color}20` : '#262626',
                      color: cat?.color || '#94a3b8'
                    }}
                  >
                    <CategoryIcon name={cat?.icon || 'Receipt'} size={18} />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white truncate max-w-[170px]">
                      {tx.merchant || cat?.name || 'Transaction'}
                    </div>
                    <div className="text-[10px] text-neutral-400 flex items-center gap-1">
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
                    className={`text-xs font-extrabold tabular-nums ${
                      isIncome
                        ? 'text-emerald-400'
                        : isExpense
                        ? 'text-neutral-100'
                        : 'text-blue-400'
                    }`}
                  >
                    {isIncome ? '+' : isExpense ? '-' : ''}
                    {formatINR(tx.amountPaise)}
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
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
