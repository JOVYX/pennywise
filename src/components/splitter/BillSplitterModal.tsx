import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  Plus,
  Trash2,
  Share2,
  Check,
  Calculator
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SplitMethod } from '../../types';
import {
  calculateBillSplit,
  buildSplitSettlement,
  BillSplitInputParticipant
} from '../../utils/billSplitter';
import { rupeesToPaise, formatINR } from '../../utils/formatters';
import { db } from '../../db';

export const BillSplitterModal: React.FC = () => {
  const { isSplitBillOpen, setIsSplitBillOpen, accounts } = useApp();

  const [billTitle, setBillTitle] = useState<string>('Swiggy Dinner');
  const [totalStr, setTotalStr] = useState<string>('1200');
  const [method, setMethod] = useState<SplitMethod>('equal');
  const [payerId, setPayerId] = useState<string>('self');
  const [friendNameInput, setFriendNameInput] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // List of participants: You + friends
  const [participants, setParticipants] = useState<BillSplitInputParticipant[]>([
    { id: 'self', name: 'You', isSelf: true, shares: 1 },
    { id: 'friend-1', name: 'Aman', isSelf: false, shares: 1 },
    { id: 'friend-2', name: 'Rohan', isSelf: false, shares: 1 }
  ]);

  const quickTitles = ['Swiggy Dinner', 'Flat Wi-Fi', 'Campus Tapri', 'Groceries', 'Auto / Cab'];

  const totalPaise = rupeesToPaise(totalStr);

  const splitResult = useMemo(() => {
    return calculateBillSplit(totalPaise, participants, method);
  }, [totalPaise, participants, method]);

  const isPayerSelf = payerId === 'self';
  const payerName = isPayerSelf
    ? 'You'
    : participants.find((p) => p.id === payerId)?.name || 'Friend';

  const settlement = useMemo(() => {
    return buildSplitSettlement({
      billTitle: billTitle.trim() || 'Group Bill',
      totalPaise,
      payerName,
      isPayerSelf,
      participants: splitResult.participants
    });
  }, [billTitle, totalPaise, payerName, isPayerSelf, splitResult.participants]);

  if (!isSplitBillOpen) return null;

  const handleAddFriend = () => {
    const trimmed = friendNameInput.trim();
    if (!trimmed) return;
    if (participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;

    setParticipants((prev) => [
      ...prev,
      {
        id: `friend-${Date.now()}`,
        name: trimmed,
        isSelf: false,
        shares: 1,
        exactPaise: 0
      }
    ]);
    setFriendNameInput('');
  };

  const handleRemoveFriend = (id: string) => {
    if (id === 'self') return; // Cannot remove self
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    if (payerId === id) {
      setPayerId('self');
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(settlement.shareableSummary);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
      }
      // Open WhatsApp web / app intent
      const encoded = encodeURIComponent(settlement.shareableSummary);
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    } catch {
      // Fallback
    }
  };

  const handleRecordToPennywise = async () => {
    if (totalPaise <= 0) return;

    const now = new Date().toISOString();
    const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
    const accId = defaultAcc?.id || 'acc-primary-bank';

    // 1. Record User's Expense in Transactions
    if (settlement.userNetExpensePaise > 0) {
      await db.transactions.add({
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'expense',
        amountPaise: settlement.userNetExpensePaise,
        accountId: accId,
        categoryId: 'food-mess',
        date: now,
        merchant: `${billTitle} (My Share)`,
        paymentMethod: 'upi',
        notes: `Split with ${participants.filter((p) => !p.isSelf).map((p) => p.name).join(', ')}`,
        createdAt: now,
        updatedAt: now
      });
    }

    // 2. Record Debts (Money lent to friends or money owed)
    for (const debtItem of settlement.debtsToCreate) {
      await db.debts.add({
        id: `debt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: debtItem.name,
        lender: debtItem.lender,
        type: debtItem.type,
        originalAmountPaise: debtItem.amountPaise,
        currentBalancePaise: debtItem.amountPaise,
        dueDate: now.slice(0, 10),
        payments: [],
        isPaidOff: false,
        notes: debtItem.notes,
        createdAt: now,
        updatedAt: now
      });
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSplitBillOpen(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-800/80 bg-neutral-900/90 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Split with Friends</h2>
              <p className="text-[11px] text-neutral-400">Splitwise-style roommate & campus bill splitter</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSplitBillOpen(false)}
            className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Bill Title & Suggestions */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Bill Name</label>
            <input
              type="text"
              value={billTitle}
              onChange={(e) => setBillTitle(e.target.value)}
              placeholder="e.g. Swiggy Dinner, Flat Wi-Fi"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-purple-500/50"
            />
            <div className="flex items-center gap-1.5 overflow-x-auto mt-2 pb-1 scrollbar-none">
              {quickTitles.map((qt) => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => setBillTitle(qt)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors ${
                    billTitle === qt
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-medium'
                      : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {qt}
                </button>
              ))}
            </div>
          </div>

          {/* Amount and Who Paid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Total Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-neutral-400 font-semibold text-sm">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={totalStr}
                  onChange={(e) => setTotalStr(e.target.value)}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-base font-bold text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Who Paid?</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-purple-500/50"
              >
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isSelf ? '(Me)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Method Tabs */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Split Method</label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
              {(['equal', 'shares', 'exact'] as SplitMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                    method === m
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {m === 'equal' ? 'Equally' : m === 'shares' ? 'By Shares' : 'Custom ₹'}
                </button>
              ))}
            </div>
          </div>

          {/* Friends in this Split */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                Split Among ({participants.length} people)
              </label>
            </div>

            {/* Friend List */}
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {splitResult.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 bg-neutral-950/70 border border-neutral-800/80 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        p.isSelf
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-white">
                      {p.name} {p.isSelf ? '(You)' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Share input if method === 'shares' */}
                    {method === 'shares' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-neutral-500">Shares:</span>
                        <input
                          type="number"
                          min="1"
                          value={participants.find((item) => item.id === p.id)?.shares || 1}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setParticipants((prev) =>
                              prev.map((item) => (item.id === p.id ? { ...item, shares: val } : item))
                            );
                          }}
                          className="w-12 px-1.5 py-1 text-center bg-neutral-900 border border-neutral-700 text-xs text-white rounded"
                        />
                      </div>
                    )}

                    <span className="text-xs font-bold text-neutral-200">
                      {formatINR(p.amountPaise)}
                    </span>

                    {!p.isSelf && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(p.id)}
                        className="text-neutral-500 hover:text-rose-400 transition-colors p-1"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Friend Input */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={friendNameInput}
                onChange={(e) => setFriendNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFriend();
                  }
                }}
                placeholder="Add friend's name (e.g. Priya)"
                className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-purple-500/50"
              />
              <button
                type="button"
                onClick={handleAddFriend}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Settlement Summary Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-neutral-950 to-neutral-900 border border-neutral-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Your Share:</span>
              <span className="font-bold text-white">{formatINR(settlement.userNetExpensePaise)}</span>
            </div>

            {isPayerSelf ? (
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-neutral-800/80">
                <span className="text-emerald-400 font-medium">Friends owe you:</span>
                <span className="font-bold text-emerald-400">
                  {formatINR(totalPaise - settlement.userNetExpensePaise)}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-neutral-800/80">
                <span className="text-amber-400 font-medium">You owe {payerName}:</span>
                <span className="font-bold text-amber-400">
                  {formatINR(settlement.userNetExpensePaise)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800/80 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-98 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all border border-neutral-700"
          >
            {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            {copySuccess ? 'Copied Link!' : 'WhatsApp / Share'}
          </button>

          <button
            type="button"
            onClick={handleRecordToPennywise}
            disabled={totalPaise <= 0 || saveSuccess}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-98 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" /> Recorded!
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" /> Save to Pennywise
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
