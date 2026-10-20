import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, ArrowDownRight, ArrowUpRight, Check, Sparkles, Clipboard, MessageSquareText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TransactionType, PaymentMethod, ParsedSmsTransaction } from '../../types';
import { rupeesToPaise, formatINR } from '../../utils/formatters';
import { parseIndianSms } from '../../utils/smsParser';
import { CategoryIcon } from '../common/CategoryIcon';

export const TransactionModal: React.FC = () => {
  const {
    isAddTxOpen,
    setIsAddTxOpen,
    editingTx,
    setEditingTx,
    accounts,
    categories,
    saveTransaction,
    settings
  } = useApp();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [date, setDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // SMS / UPI Quick Paste State
  const [isSmsOpen, setIsSmsOpen] = useState<boolean>(false);
  const [smsText, setSmsText] = useState<string>('');
  const [parsedSms, setParsedSms] = useState<ParsedSmsTransaction | null>(null);

  // Suggestions for Indian students
  const quickMerchants = [
    'Tapri Chai',
    'College Canteen',
    'Swiggy / Zomato',
    'Blinkit / Zepto',
    'Metro Recharge',
    'Jio / Airtel',
    'Campus Mess'
  ];

  useEffect(() => {
    if (editingTx) {
      setType(editingTx.type);
      setAmountStr((editingTx.amountPaise / 100).toString());
      setAccountId(editingTx.accountId);
      setToAccountId(editingTx.toAccountId || '');
      setCategoryId(editingTx.categoryId);
      setSubCategory(editingTx.subCategory || '');
      setMerchant(editingTx.merchant);
      setPaymentMethod(editingTx.paymentMethod);
      setDate(editingTx.date.slice(0, 16)); // YYYY-MM-DDTHH:mm
      setNotes(editingTx.notes || '');
    } else {
      // Default reset
      setType('expense');
      setAmountStr('');
      const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
      setAccountId(defaultAcc ? defaultAcc.id : '');
      setToAccountId(accounts[1]?.id || '');
      const defaultCat = categories.find((c) => c.type === 'expense');
      setCategoryId(defaultCat ? defaultCat.id : 'food-mess');
      setSubCategory('');
      setMerchant('');
      setPaymentMethod('upi');
      // Current date formatted for datetime-local
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setDate(now.toISOString().slice(0, 16));
      setNotes('');
    }
    setErrorMsg('');
  }, [editingTx, isAddTxOpen, accounts, categories]);

  const handleSmsChange = (text: string) => {
    setSmsText(text);
    if (text.trim().length > 10) {
      const parsed = parseIndianSms(text, categories);
      setParsedSms(parsed);
    } else {
      setParsedSms(null);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setSmsText(text);
          const parsed = parseIndianSms(text, categories);
          setParsedSms(parsed);
          if (parsed) {
            applyParsedSms(parsed);
          }
        }
      }
    } catch {
      // Clipboard read permissions may be restricted
    }
  };

  const applyParsedSms = (parsed: ParsedSmsTransaction) => {
    setType(parsed.type);
    setAmountStr((parsed.amountPaise / 100).toString());
    setMerchant(parsed.merchant);
    setCategoryId(parsed.categoryId);
    setPaymentMethod(parsed.paymentMethod);
    if (parsed.date) {
      setDate(parsed.date.slice(0, 16));
    }
    if (parsed.accountHint) {
      setNotes(parsed.accountHint);
    }
    setIsSmsOpen(false);
  };

  if (!isAddTxOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === (type === 'transfer' ? 'expense' : type));
  const activeCategory = categories.find((c) => c.id === categoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const paise = rupeesToPaise(amountStr);
    if (paise <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₹0');
      return;
    }

    if (!accountId) {
      setErrorMsg('Please select an account');
      return;
    }

    if (type === 'transfer') {
      if (!toAccountId) {
        setErrorMsg('Please select a destination account for the transfer');
        return;
      }
      if (accountId === toAccountId) {
        setErrorMsg('Source and destination accounts must be different');
        return;
      }
    } else if (!categoryId) {
      setErrorMsg('Please select a category');
      return;
    }

    try {
      await saveTransaction({
        id: editingTx?.id,
        type,
        amountPaise: paise,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        categoryId: type === 'transfer' ? 'miscellaneous' : categoryId,
        subCategory: type === 'transfer' ? undefined : subCategory,
        merchant: merchant.trim() || (type === 'transfer' ? 'Account Transfer' : activeCategory?.name || 'Transaction'),
        paymentMethod,
        date: new Date(date).toISOString(),
        notes: notes.trim()
      });

      setIsAddTxOpen(false);
      setEditingTx(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save transaction');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#121214] border-t sm:border border-white/[0.1] rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Grab Handle */}
        <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-1 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-3 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center space-x-2">
            <h2 className="text-[15px] font-semibold text-white tracking-tight">
              {editingTx ? 'Edit Transaction' : 'Record Transaction'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAddTxOpen(false);
              setEditingTx(null);
            }}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 text-xs font-medium bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* SMS / UPI Auto-Fill Banner & Dropdown */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsSmsOpen(!isSmsOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-neutral-200 hover:border-white/[0.14] transition-all text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neutral-300" />
                <span>Paste Bank / UPI SMS Alert</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-neutral-300 font-medium border border-white/[0.06]">
                Auto-Fill
              </span>
            </button>

            {isSmsOpen && (
              <div className="p-3.5 bg-black/60 rounded-2xl border border-white/[0.06] space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5">
                    <MessageSquareText className="w-3.5 h-3.5 text-neutral-400" />
                    Paste Bank Alert SMS
                  </span>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="text-[11px] font-medium text-white hover:text-neutral-200 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg bg-white/[0.08] border border-white/[0.06]"
                  >
                    <Clipboard className="w-3 h-3" />
                    Paste Clipboard
                  </button>
                </div>

                <textarea
                  value={smsText}
                  onChange={(e) => handleSmsChange(e.target.value)}
                  placeholder="e.g. 'Rs. 250.00 debited from A/C **1234 on 20-Oct-26 by UPI to SWIGGY...'"
                  aria-label="Paste SMS text"
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-black/80 border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 resize-none"
                />

                {parsedSms && (
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>₹{parsedSms.amountPaise / 100}</span>
                        <span className="text-[11px] font-medium text-neutral-300">
                          {parsedSms.merchant}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">
                        {parsedSms.type.toUpperCase()} • {parsedSms.paymentMethod.toUpperCase()}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyParsedSms(parsedSms)}
                      className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      Apply
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Type Segmented Control */}
          <div className="grid grid-cols-3 gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const cat = categories.find((c) => c.type === 'expense');
                if (cat) setCategoryId(cat.id);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl transition-all ${
                type === 'expense'
                  ? 'bg-white/[0.14] text-white font-semibold shadow-sm ring-1 ring-white/10'
                  : 'text-neutral-400 hover:text-neutral-200 font-medium'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              Expense
            </button>

            <button
              type="button"
              onClick={() => {
                setType('income');
                const cat = categories.find((c) => c.type === 'income');
                if (cat) setCategoryId(cat.id);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl transition-all ${
                type === 'income'
                  ? 'bg-white/[0.14] text-emerald-400 font-semibold shadow-sm ring-1 ring-emerald-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 font-medium'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Income
            </button>

            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl transition-all ${
                type === 'transfer'
                  ? 'bg-white/[0.14] text-neutral-200 font-semibold shadow-sm ring-1 ring-white/10'
                  : 'text-neutral-400 hover:text-neutral-200 font-medium'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Transfer
            </button>
          </div>

          {/* Amount Large Numeric Input */}
          <div className="bg-black/60 rounded-2xl p-4 border border-white/[0.06] text-center">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
              Amount
            </label>
            <div className="flex items-center justify-center">
              <span className="text-3xl font-extrabold text-neutral-400 mr-1.5">₹</span>
              <input
                id="input-transaction-amount"
                type="number"
                step="any"
                inputMode="decimal"
                autoFocus={!editingTx}
                placeholder="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-48 text-3xl font-extrabold text-white text-center bg-transparent focus:outline-none placeholder:text-neutral-600 tabular-nums tracking-tight"
              />
            </div>
            {amountStr && (
              <p className="text-xs text-neutral-400 mt-1 tabular-nums font-medium">
                {formatINR(rupeesToPaise(amountStr), { showPaise: settings.showPaise })}
              </p>
            )}
          </div>

          {/* Account Selection */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[11px] font-medium text-neutral-300 block mb-1">
                {type === 'transfer' ? 'From Account' : 'Account'}
              </label>
              <select
                id="select-transaction-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-black/80 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-neutral-900 text-white">
                    {acc.name} ({formatINR(acc.openingBalancePaise)})
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' && (
              <div>
                <label className="text-[11px] font-medium text-neutral-300 block mb-1">
                  To Destination Account
                </label>
                <select
                  id="select-transaction-to-account"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full bg-black/80 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                >
                  <option value="" className="bg-neutral-900 text-white">Select destination...</option>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-neutral-900 text-white">
                        {acc.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Category Grid (for expense & income) */}
          {type !== 'transfer' && (
            <div>
              <label className="text-[11px] font-medium text-neutral-300 block mb-2">
                Category
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                {filteredCategories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(cat.id);
                        setSubCategory('');
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-white/[0.12] border-white/30 text-white shadow-sm ring-1 ring-white/10 font-medium'
                          : 'bg-white/[0.03] border-white/[0.05] text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 text-white"
                        style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} size={16} />
                      </div>
                      <span className="text-[10px] font-medium truncate w-full">
                        {cat.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Subcategories */}
              {activeCategory?.subcategories && activeCategory.subcategories.length > 0 && (
                <div className="mt-2.5">
                  <label className="text-[11px] font-medium text-neutral-400 block mb-1">
                    Subcategory (Optional)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCategory.subcategories.map((sub) => {
                      const isSubSelected = subCategory === sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSubCategory(isSubSelected ? '' : sub)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            isSubSelected
                              ? 'bg-white/[0.14] border-white/30 text-white font-medium'
                              : 'bg-black/60 border-white/[0.06] text-neutral-400 hover:text-white'
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Merchant / Title Input & Quick Suggestions */}
          <div>
            <label className="text-[11px] font-medium text-neutral-300 block mb-1">
              {type === 'income' ? 'Source / Sender' : type === 'transfer' ? 'Reference' : 'Merchant / Description'}
            </label>
            <input
              id="input-transaction-merchant"
              type="text"
              placeholder={type === 'income' ? 'e.g. Parents, Client' : 'e.g. Tapri, Swiggy, Mess'}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full bg-black/80 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
            {type === 'expense' && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {quickMerchants.slice(0, 4).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMerchant(m)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.05] text-neutral-300 hover:text-white border border-white/[0.05]"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method & Date in 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-neutral-300 block mb-1">
                Payment Method
              </label>
              <select
                id="select-transaction-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-black/80 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-white/30"
              >
                <option value="upi" className="bg-neutral-900 text-white">UPI (GPay / Paytm / PhonePe)</option>
                <option value="cash" className="bg-neutral-900 text-white">Cash</option>
                <option value="card" className="bg-neutral-900 text-white">Debit / Credit Card</option>
                <option value="netbanking" className="bg-neutral-900 text-white">Net Banking / IMPS</option>
                <option value="other" className="bg-neutral-900 text-white">Other</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-neutral-300 block mb-1">
                Date & Time
              </label>
              <input
                id="input-transaction-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-black/80 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-medium text-neutral-300 block mb-1">
              Notes (Optional)
            </label>
            <input
              id="input-transaction-notes"
              type="text"
              placeholder="Split with friend, bill copy, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-black/80 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="btn-submit-transaction"
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-white text-black font-semibold text-sm active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              {editingTx ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
