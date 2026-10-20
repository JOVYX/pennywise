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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="split-modal-title"
    >
      <div className="w-full max-w-md max-h-[92vh] flex flex-col bg-[#111827] border-t sm:border border-[#1f293d] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Grab Handle for Mobile */}
        <div className="w-9 h-1 rounded-full bg-slate-700 mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1f293d] bg-[#111827]/95 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#161e2e] border border-[#1f293d] text-amber-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 id="split-modal-title" className="text-sm font-semibold text-white tracking-tight">
                Split with Friends
              </h2>
              <p className="text-[11px] text-slate-400">
                Roommate & campus bill splitter with zero-loss paise conservation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSplitBillOpen(false)}
            className="w-7 h-7 rounded-lg bg-[#161e2e] border border-[#1f293d] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Bill Title & Suggestions */}
          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1.5 font-semibold">
              Bill Title
            </label>
            <input
              type="text"
              value={billTitle}
              onChange={(e) => setBillTitle(e.target.value)}
              placeholder="e.g. Swiggy Dinner, Flat Wi-Fi"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b0f17] border border-[#1f293d] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
            />
            <div className="flex items-center gap-1.5 overflow-x-auto mt-2 pb-1 scrollbar-none">
              {quickTitles.map((qt) => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => setBillTitle(qt)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono whitespace-nowrap transition-colors ${
                    billTitle === qt
                      ? 'bg-amber-400/10 border-amber-400/30 text-amber-300 font-medium'
                      : 'bg-[#161e2e] border-[#1f293d] text-slate-400 hover:text-slate-200'
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
              <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1.5 font-semibold">
                Total Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono font-bold text-sm">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={totalStr}
                  onChange={(e) => setTotalStr(e.target.value)}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-[#0b0f17] border border-[#1f293d] text-base font-bold text-white font-mono focus:outline-none focus:border-amber-400/50 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1.5 font-semibold">
                Who Paid?
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0b0f17] border border-[#1f293d] text-sm text-white focus:outline-none focus:border-amber-400/50"
              >
                {participants.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#111827] text-white">
                    {p.name} {p.isSelf ? '(Me)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Method Tabs */}
          <div>
            <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1.5 font-semibold">
              Split Method
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#0b0f17] rounded-xl border border-[#1f293d]">
              {(['equal', 'shares', 'exact'] as SplitMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-1.5 text-xs font-mono font-medium rounded-lg capitalize transition-all ${
                    method === m
                      ? 'bg-[#161e2e] text-amber-400 border border-[#1f293d] font-semibold'
                      : 'text-slate-400 hover:text-white'
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
              <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
                Split Among ({participants.length} people)
              </label>
            </div>

            {/* Friend List */}
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {splitResult.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 bg-[#0b0f17] border border-[#1f293d] rounded-xl hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-semibold ${
                        p.isSelf
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                          : 'bg-[#161e2e] text-slate-300 border border-[#1f293d]'
                      }`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-white">
                      {p.name} {p.isSelf ? '(You)' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Share input if method === 'shares' */}
                    {method === 'shares' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-slate-500">Shares:</span>
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
                          className="w-12 px-1.5 py-0.5 text-center bg-[#161e2e] border border-[#1f293d] font-mono text-xs text-white rounded-md"
                        />
                      </div>
                    )}

                    <span className="text-xs font-mono font-semibold text-white tabular-nums">
                      {formatINR(p.amountPaise)}
                    </span>

                    {!p.isSelf && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(p.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
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
                className="flex-1 px-3 py-2 rounded-xl bg-[#0b0f17] border border-[#1f293d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400/50"
              />
              <button
                type="button"
                onClick={handleAddFriend}
                className="px-3.5 py-2 rounded-xl bg-[#161e2e] hover:bg-[#1f293d] text-xs font-medium text-white flex items-center gap-1 transition-colors border border-[#1f293d]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Settlement Summary Card */}
          <div className="p-3.5 rounded-xl bg-[#0b0f17] border border-[#1f293d] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Your Share:</span>
              <span className="font-mono font-semibold text-white tabular-nums">
                {formatINR(settlement.userNetExpensePaise)}
              </span>
            </div>

            {isPayerSelf ? (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1f293d]">
                <span className="text-emerald-400 font-medium">Friends owe you:</span>
                <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                  {formatINR(totalPaise - settlement.userNetExpensePaise)}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1f293d]">
                <span className="text-amber-400 font-medium">You owe {payerName}:</span>
                <span className="font-mono font-semibold text-amber-300 tabular-nums">
                  {formatINR(settlement.userNetExpensePaise)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#111827] border-t border-[#1f293d] grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="py-2.5 px-3 rounded-xl bg-[#161e2e] hover:bg-[#1f293d] active:scale-95 text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition-all border border-[#1f293d]"
          >
            {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            {copySuccess ? 'Copied Link!' : 'WhatsApp / Share'}
          </button>

          <button
            type="button"
            onClick={handleRecordToPennywise}
            disabled={totalPaise <= 0 || saveSuccess}
            className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-xs font-bold text-black flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" /> Recorded!
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
