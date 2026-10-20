import React, { useState, useMemo } from 'react';
import {
  Search,
  Trash2,
  Copy,
  Edit2,
  X,
  Users
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Transaction } from '../types';
import { formatINR, formatFriendlyDate } from '../utils/formatters';
import { CategoryIcon } from '../components/common/CategoryIcon';

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    currentMonth,
    setIsAddTxOpen,
    setEditingTx,
    saveTransaction,
    deleteTransaction,
    setIsSplitBillOpen
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [activeTxDetail, setActiveTxDetail] = useState<Transaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      // Month match
      if (!tx.date.startsWith(currentMonth)) return false;

      // Type match
      if (selectedType !== 'all' && tx.type !== selectedType) return false;

      // Account match
      if (selectedAccount !== 'all' && tx.accountId !== selectedAccount && tx.toAccountId !== selectedAccount) {
        return false;
      }

      // Category match
      if (selectedCategory !== 'all' && tx.categoryId !== selectedCategory) return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const merchantMatch = tx.merchant?.toLowerCase().includes(q);
        const notesMatch = tx.notes?.toLowerCase().includes(q);
        const catName = categoryMap.get(tx.categoryId)?.name.toLowerCase();
        const subCatMatch = tx.subCategory?.toLowerCase().includes(q);
        if (!merchantMatch && !notesMatch && !catName?.includes(q) && !subCatMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount-desc') return b.amountPaise - a.amountPaise;
      if (sortBy === 'amount-asc') return a.amountPaise - b.amountPaise;
      return 0;
    });
  }, [transactions, currentMonth, selectedType, selectedAccount, selectedCategory, searchQuery, sortBy, categoryMap]);

  // Group transactions by date string (YYYY-MM-DD)
  const groupedByDay = useMemo(() => {
    const groups: { dateKey: string; items: Transaction[]; dailyExpensePaise: number }[] = [];
    const dateMap = new Map<string, Transaction[]>();

    for (const tx of filtered) {
      const day = tx.date.slice(0, 10);
      if (!dateMap.has(day)) {
        dateMap.set(day, []);
      }
      dateMap.get(day)!.push(tx);
    }

    for (const [dateKey, items] of dateMap.entries()) {
      const dailyExpense = items
        .filter((i) => i.type === 'expense')
        .reduce((sum, i) => sum + i.amountPaise, 0);

      groups.push({
        dateKey,
        items,
        dailyExpensePaise: dailyExpense
      });
    }

    return groups;
  }, [filtered]);

  const handleDuplicate = async (tx: Transaction) => {
    const now = new Date().toISOString();
    await saveTransaction({
      type: tx.type,
      amountPaise: tx.amountPaise,
      accountId: tx.accountId,
      toAccountId: tx.toAccountId,
      categoryId: tx.categoryId,
      subCategory: tx.subCategory,
      merchant: `${tx.merchant} (Copy)`,
      paymentMethod: tx.paymentMethod,
      date: now,
      notes: tx.notes
    });
    setActiveTxDetail(null);
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    setConfirmDeleteId(null);
    setActiveTxDetail(null);
  };

  return (
    <div className="space-y-3 px-4 py-3 max-w-md mx-auto">
      {/* Top Search & Filter Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              id="input-search-transactions"
              type="text"
              placeholder="Search merchant, notes, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSplitBillOpen(true)}
            title="Split Bill with Friends"
            className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 active:scale-95 transition-all shrink-0 flex items-center justify-center"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize shrink-0 border transition-all ${
                selectedType === t
                  ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-sm'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}

          {/* Account Filter Dropdown */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-2.5 py-1 focus:outline-none shrink-0"
          >
            <option value="all">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Category Filter Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-2.5 py-1 focus:outline-none shrink-0"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-2.5 py-1 focus:outline-none shrink-0"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Amount: High to Low</option>
            <option value="amount-asc">Amount: Low to High</option>
          </select>
        </div>
      </div>

      {/* Transaction List / Groupings */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-neutral-900 border border-neutral-800 rounded-3xl mt-4">
          <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto mb-2">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">No Transactions Found</h3>
          <p className="text-xs text-neutral-400 mb-3 max-w-xs mx-auto">
            Try adjusting your search or filters, or log a new transaction.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setIsAddTxOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-bold text-xs"
          >
            + Add Transaction
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDay.map(({ dateKey, items, dailyExpensePaise }) => {
            const dateObj = new Date(dateKey + 'T00:00:00');
            const formattedDateHeader = dateObj.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            });

            return (
              <div key={dateKey} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-sm">
                {/* Day Header with Daily Total */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/80 text-xs">
                  <span className="font-bold text-neutral-300">{formattedDateHeader}</span>
                  {dailyExpensePaise > 0 && (
                    <span className="text-[11px] font-semibold text-neutral-400">
                      Total Spent: <strong className="text-white">{formatINR(dailyExpensePaise)}</strong>
                    </span>
                  )}
                </div>

                {/* Items in day */}
                <div className="divide-y divide-neutral-800/60">
                  {items.map((tx) => {
                    const cat = categoryMap.get(tx.categoryId);
                    const isExpense = tx.type === 'expense';
                    const isIncome = tx.type === 'income';

                    return (
                      <div
                        key={tx.id}
                        onClick={() => setActiveTxDetail(tx)}
                        className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 px-2 -mx-2 rounded-xl transition-all"
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
                            <div className="text-[10px] text-neutral-400 flex items-center gap-1.5">
                              <span>{accountMap.get(tx.accountId) || 'Account'}</span>
                              {tx.subCategory && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[80px]">{tx.subCategory}</span>
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
                                ? 'text-white'
                                : 'text-blue-400'
                            }`}
                          >
                            {isIncome ? '+' : isExpense ? '-' : ''}
                            {formatINR(tx.amountPaise)}
                          </div>
                          <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800">
                            {tx.paymentMethod}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail / Action Bottom Sheet Modal */}
      {activeTxDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">Transaction Details</h3>
              <button
                type="button"
                onClick={() => setActiveTxDetail(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="text-center py-2">
                <span className="text-[11px] uppercase font-bold text-neutral-400 block mb-0.5">
                  {activeTxDetail.type}
                </span>
                <span
                  className={`text-3xl font-extrabold tabular-nums ${
                    activeTxDetail.type === 'income'
                      ? 'text-emerald-400'
                      : activeTxDetail.type === 'expense'
                      ? 'text-white'
                      : 'text-blue-400'
                  }`}
                >
                  {formatINR(activeTxDetail.amountPaise, { showPaise: true })}
                </span>
              </div>

              <div className="bg-neutral-950 rounded-2xl p-3 space-y-2 text-xs border border-neutral-800">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Merchant / Title</span>
                  <span className="font-semibold text-white">{activeTxDetail.merchant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Category</span>
                  <span className="font-semibold text-white">
                    {categoryMap.get(activeTxDetail.categoryId)?.name || activeTxDetail.categoryId}
                  </span>
                </div>
                {activeTxDetail.subCategory && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Subcategory</span>
                    <span className="font-semibold text-white">{activeTxDetail.subCategory}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-400">Account</span>
                  <span className="font-semibold text-white">
                    {accountMap.get(activeTxDetail.accountId) || activeTxDetail.accountId}
                  </span>
                </div>
                {activeTxDetail.toAccountId && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">To Account</span>
                    <span className="font-semibold text-white">
                      {accountMap.get(activeTxDetail.toAccountId) || activeTxDetail.toAccountId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-400">Payment Method</span>
                  <span className="font-semibold text-white uppercase">
                    {activeTxDetail.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Date</span>
                  <span className="font-semibold text-white">
                    {formatFriendlyDate(activeTxDetail.date)}
                  </span>
                </div>
                {activeTxDetail.notes && (
                  <div className="pt-2 border-t border-neutral-800">
                    <span className="text-neutral-400 block mb-0.5">Notes</span>
                    <p className="text-neutral-200">{activeTxDetail.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingTx(activeTxDetail);
                  setActiveTxDetail(null);
                  setIsAddTxOpen(true);
                }}
                className="py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>

              <button
                type="button"
                onClick={() => handleDuplicate(activeTxDetail)}
                className="py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </button>

              {confirmDeleteId === activeTxDetail.id ? (
                <button
                  type="button"
                  onClick={() => handleDelete(activeTxDetail.id)}
                  className="py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 animate-pulse"
                >
                  Confirm Delete
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(activeTxDetail.id)}
                  className="py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
