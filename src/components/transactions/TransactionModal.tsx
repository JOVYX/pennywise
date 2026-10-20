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
      setDate(editingTx.date.slice(0, 16));
      setNotes(editingTx.notes || '');
    } else {
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
      // Clipboard read may be restricted
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[#111827] border-t sm:border border-[#1f293d] rounded-t-2xl sm:rounded-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mt-3 mb-1 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-3 pb-3 border-b border-[#1f293d]">
          <div className="flex items-center space-x-2">
            <h2 className="mono text-xs font-bold uppercase tracking-wider text-white">
              {editingTx ? 'EDIT JOURNAL ENTRY' : 'LOG JOURNAL ENTRY'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAddTxOpen(false);
              setEditingTx(null);
            }}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#161e2e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded">
              {errorMsg}
            </div>
          )}

          {/* SMS / UPI Auto-Fill Banner & Dropdown */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsSmsOpen(!isSmsOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded bg-[#161e2e] border border-[#28354b] text-slate-200 hover:border-amber-400/40 transition-all text-xs font-semibold"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Paste Bank / UPI SMS Alert</span>
              </div>
              <span className="mono text-[10px] px-2 py-0.5 rounded bg-[#111827] text-amber-400 font-bold border border-[#1f293d]">
                PARSE SMS
              </span>
            </button>

            {isSmsOpen && (
              <div className="p-3.5 bg-[#0b0f17] rounded border border-[#1f293d] space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="mono text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquareText className="w-3.5 h-3.5 text-slate-400" />
                    PASTE RAW SMS TEXT
                  </span>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="mono text-[10px] font-bold text-amber-400 hover:text-white flex items-center gap-1 transition-colors px-2.5 py-1 rounded bg-[#161e2e] border border-[#28354b]"
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
                  className="mono w-full p-2.5 rounded bg-[#161e2e] border border-[#28354b] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400/50 resize-none"
                />

                {parsedSms && (
                  <div className="p-2.5 rounded bg-[#161e2e] border border-[#28354b] flex items-center justify-between">
                    <div>
                      <div className="mono text-xs font-bold text-white flex items-center gap-2">
                        <span>₹{parsedSms.amountPaise / 100}</span>
                        <span className="text-[11px] font-semibold text-slate-300">
                          {parsedSms.merchant}
                        </span>
                      </div>
                      <div className="mono text-[10px] text-slate-400 mt-0.5">
                        {parsedSms.type.toUpperCase()} • {parsedSms.paymentMethod.toUpperCase()}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyParsedSms(parsedSms)}
                      className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
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
          <div className="grid grid-cols-3 gap-1 bg-[#161e2e] p-1 rounded border border-[#28354b]">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const cat = categories.find((c) => c.type === 'expense');
                if (cat) setCategoryId(cat.id);
              }}
              className={`mono flex items-center justify-center gap-1.5 py-2 text-xs rounded transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              EXPENSE
            </button>

            <button
              type="button"
              onClick={() => {
                setType('income');
                const cat = categories.find((c) => c.type === 'income');
                if (cat) setCategoryId(cat.id);
              }}
              className={`mono flex items-center justify-center gap-1.5 py-2 text-xs rounded transition-all ${
                type === 'income'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              INCOME
            </button>

            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`mono flex items-center justify-center gap-1.5 py-2 text-xs rounded transition-all ${
                type === 'transfer'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              TRANSFER
            </button>
          </div>

          {/* Amount Large Numeric Input */}
          <div className="bg-[#161e2e] rounded-lg p-4 border border-[#28354b] text-center">
            <label className="mono text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              AMOUNT (RUPEES)
            </label>
            <div className="flex items-center justify-center">
              <span className="mono text-3xl font-extrabold text-amber-400 mr-1.5">₹</span>
              <input
                id="input-transaction-amount"
                type="number"
                step="any"
                inputMode="decimal"
                autoFocus={!editingTx}
                placeholder="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="mono w-48 text-3xl font-extrabold text-white text-center bg-transparent focus:outline-none placeholder:text-slate-600 tabular-nums tracking-tight"
              />
            </div>
            {amountStr && (
              <p className="mono text-xs text-slate-400 mt-1 tabular-nums font-semibold">
                {formatINR(rupeesToPaise(amountStr), { showPaise: settings.showPaise })}
              </p>
            )}
          </div>

          {/* Account Selection */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mono text-[10px] font-bold text-slate-300 block mb-1 uppercase tracking-wider">
                {type === 'transfer' ? 'FROM ACCOUNT' : 'ACCOUNT LEDGER'}
              </label>
              <select
                id="select-transaction-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mono w-full bg-[#161e2e] border border-[#28354b] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-[#111827] text-white">
                    {acc.name} ({formatINR(acc.openingBalancePaise)})
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' && (
              <div>
                <label className="mono text-[10px] font-bold text-slate-300 block mb-1 uppercase tracking-wider">
                  TO DESTINATION ACCOUNT
                </label>
                <select
                  id="select-transaction-to-account"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="mono w-full bg-[#161e2e] border border-[#28354b] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                >
                  <option value="" className="bg-[#111827] text-white">Select destination...</option>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-[#111827] text-white">
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
              <label className="mono text-[10px] font-bold text-slate-300 block mb-2 uppercase tracking-wider">
                TRANSACTION CATEGORY
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
                      className={`flex flex-col items-center justify-center p-2 rounded border text-center transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-white font-bold'
                          : 'bg-[#161e2e] border-[#28354b] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center mb-1 text-white"
                        style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} size={16} />
                      </div>
                      <span className="mono text-[10px] font-medium truncate w-full">
                        {cat.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Subcategories */}
              {activeCategory?.subcategories && activeCategory.subcategories.length > 0 && (
                <div className="mt-2.5">
                  <label className="mono text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    SUBCATEGORY PRESET
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCategory.subcategories.map((sub) => {
                      const isSubSelected = subCategory === sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSubCategory(isSubSelected ? '' : sub)}
                          className={`mono text-xs px-2.5 py-1 rounded border transition-all ${
                            isSubSelected
                              ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                              : 'bg-[#161e2e] border-[#28354b] text-slate-400 hover:text-white'
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

          {/* Merchant / Description Input & Student Quick Suggestions */}
          <div>
            <label className="mono text-[10px] font-bold text-slate-300 block mb-1 uppercase tracking-wider">
              {type === 'income' ? 'SOURCE / SENDER' : type === 'transfer' ? 'REFERENCE' : 'MERCHANT / PAYEE'}
            </label>
            <input
              id="input-transaction-merchant"
              type="text"
              placeholder={type === 'income' ? 'e.g. Parents, Client' : 'e.g. Tapri, Swiggy, Mess'}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full bg-[#161e2e] border border-[#28354b] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
            />
            {type === 'expense' && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {quickMerchants.slice(0, 4).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMerchant(m)}
                    className="mono text-[10px] px-2 py-0.5 rounded bg-[#161e2e] text-slate-300 hover:text-white border border-[#28354b]"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mono text-[10px] font-bold text-slate-300 block mb-1 uppercase tracking-wider">
                PAYMENT METHOD
              </label>
              <select
                id="select-transaction-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="mono w-full bg-[#161e2e] border border-[#28354b] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
              >
                <option value="upi" className="bg-[#111827] text-white">UPI (GPay/Paytm)</option>
                <option value="cash" className="bg-[#111827] text-white">Cash</option>
                <option value="card" className="bg-[#111827] text-white">Debit / Credit Card</option>
                <option value="netbanking" className="bg-[#111827] text-white">Net Banking</option>
                <option value="other" className="bg-[#111827] text-white">Other</option>
              </select>
            </div>

            <div>
              <label className="mono text-[10px] font-bold text-slate-300 block mb-1 uppercase tracking-wider">
                DATE & TIME
              </label>
              <input
                id="input-transaction-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mono w-full bg-[#161e2e] border border-[#28354b] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mono text-[10px] font-bold text-slate-300 block mb-1 uppercase tracking-wider">
              NOTES (OPTIONAL)
            </label>
            <input
              id="input-transaction-notes"
              type="text"
              placeholder="Split notes, invoice ref, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#161e2e] border border-[#28354b] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="btn-submit-transaction"
              type="submit"
              aria-label={editingTx ? 'Update transaction' : 'Save transaction'}
              className="mono w-full py-3 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all shadow flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.8]" />
              {editingTx ? 'UPDATE TRANSACTION' : 'SAVE TRANSACTION'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
