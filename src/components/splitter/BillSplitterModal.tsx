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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[92vh] flex flex-col bg-[#121214] border-t sm:border border-white/[0.1] rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Grab Handle */}
        <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-3 pb-3 border-b border-white/[0.08] bg-[#121214]/90 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] text-neutral-300 flex items-center justify-center">
              <Users className="w-4 h-4 text-neutral-300" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white leading-tight tracking-tight">Split with Friends</h2>
              <p className="text-[11px] text-neutral-500">Roommate & campus bill splitter with zero-loss paise conservation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSplitBillOpen(false)}
            className="w-8 h-8 rounded-full bg-white/[0.06] text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Bill Title & Suggestions */}
          <div>
            <label className="text-[11px] font-medium text-neutral-300 block mb-1.5">Bill Name</label>
            <input
              type="text"
              value={billTitle}
              onChange={(e) => setBillTitle(e.target.value)}
              placeholder="e.g. Swiggy Dinner, Flat Wi-Fi"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/[0.08] text-sm text-white focus:outline-none focus:border-white/30"
            />
            <div className="flex items-center gap-1.5 overflow-x-auto mt-2 pb-1 scrollbar-none">
              {quickTitles.map((qt) => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => setBillTitle(qt)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors ${
                    billTitle === qt
                      ? 'bg-white/[0.14] border-white/20 text-white font-medium'
                      : 'bg-white/[0.03] border-white/[0.05] text-neutral-400 hover:text-neutral-200'
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
              <label className="text-[11px] font-medium text-neutral-300 block mb-1.5">Total Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-neutral-400 font-semibold text-sm">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={totalStr}
                  onChange={(e) => setTotalStr(e.target.value)}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-black/80 border border-white/[0.08] text-base font-bold text-white focus:outline-none focus:border-white/30 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-neutral-300 block mb-1.5">Who Paid?</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/80 border border-white/[0.08] text-sm text-white focus:outline-none focus:border-white/30"
              >
                {participants.map((p) => (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                    {p.name} {p.isSelf ? '(Me)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Method Tabs */}
          <div>
            <label className="text-[11px] font-medium text-neutral-300 block mb-1.5">Split Method</label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-white/[0.04] rounded-2xl border border-white/[0.08]">
              {(['equal', 'shares', 'exact'] as SplitMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-1.5 text-xs font-medium rounded-xl capitalize transition-all ${
                    method === m
                      ? 'bg-white/[0.14] text-white shadow-sm ring-1 ring-white/10 font-semibold'
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
              <label className="text-[11px] font-medium text-neutral-300">
                Split Among ({participants.length} people)
              </label>
            </div>

            {/* Friend List */}
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {splitResult.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 bg-black/50 border border-white/[0.05] rounded-xl hover:border-white/[0.09] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold ${
                        p.isSelf
                          ? 'bg-white/[0.14] text-white border border-white/20'
                          : 'bg-white/[0.04] text-neutral-300'
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
                          className="w-12 px-1.5 py-1 text-center bg-black/80 border border-white/[0.08] text-xs text-white rounded"
                        />
                      </div>
                    )}

                    <span className="text-xs font-semibold text-white tabular-nums tracking-tight">
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
                className="flex-1 px-3 py-2 rounded-xl bg-black/80 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-white/30"
              />
              <button
                type="button"
                onClick={handleAddFriend}
                className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white flex items-center gap-1 transition-colors border border-white/[0.06]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Settlement Summary Card */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.06] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Your Share:</span>
              <span className="font-semibold text-white tabular-nums">{formatINR(settlement.userNetExpensePaise)}</span>
            </div>

            {isPayerSelf ? (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.06]">
                <span className="text-emerald-400 font-medium">Friends owe you:</span>
                <span className="font-semibold text-emerald-400 tabular-nums">
                  {formatINR(totalPaise - settlement.userNetExpensePaise)}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.06]">
                <span className="text-neutral-300 font-medium">You owe {payerName}:</span>
                <span className="font-semibold text-white tabular-nums">
                  {formatINR(settlement.userNetExpensePaise)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#121214] border-t border-white/[0.08] grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="py-3 px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 text-xs font-medium text-white flex items-center justify-center gap-2 transition-all border border-white/[0.08]"
          >
            {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            {copySuccess ? 'Copied Link!' : 'WhatsApp / Share'}
          </button>

          <button
            type="button"
            onClick={handleRecordToPennywise}
            disabled={totalPaise <= 0 || saveSuccess}
            className="py-3 px-4 rounded-2xl bg-white hover:bg-neutral-200 active:scale-95 text-xs font-semibold text-black flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40"
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
