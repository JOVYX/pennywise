import React, { useState } from 'react';
import { CalendarClock, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/formatters';

export const UpcomingBillsWidget: React.FC = () => {
  const { recurringRules, debts, accounts, markRecurringProcessed, recordDebtPayment } = useApp();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const activeBills = recurringRules.filter(
    (r) => r.isActive && r.type === 'expense'
  );
  const activeDebts = debts.filter((d) => !d.isPaidOff && d.currentBalancePaise > 0);

  if (activeBills.length === 0 && activeDebts.length === 0) {
    return null;
  }

  const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];

  const handlePayBill = async (ruleId: string) => {
    setProcessingId(ruleId);
    try {
      await markRecurringProcessed(ruleId, { recordTx: true });
    } finally {
      setProcessingId(null);
    }
  };

  const handlePayDebt = async (debtId: string, amountPaise: number) => {
    if (!defaultAccount) return;
    setProcessingId(debtId);
    try {
      await recordDebtPayment({
        debtId,
        amountPaise,
        accountId: defaultAccount.id
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <CalendarClock className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Upcoming Bills & Repayments
          </h3>
        </div>
        <span className="text-[11px] font-medium text-neutral-400">
          {activeBills.length + activeDebts.length} pending
        </span>
      </div>

      <div className="space-y-2.5">
        {/* Recurring Bills */}
        {activeBills.slice(0, 3).map((bill) => (
          <div
            key={bill.id}
            className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80"
          >
            <div>
              <div className="text-xs font-bold text-white truncate max-w-[160px]">
                {bill.name}
              </div>
              <div className="text-[10px] text-neutral-400">
                Due {bill.nextDueDate} • {bill.frequency}
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-extrabold text-neutral-200 tabular-nums">
                {formatINR(bill.amountPaise)}
              </span>
              <button
                type="button"
                disabled={processingId === bill.id}
                onClick={() => handlePayBill(bill.id)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500 hover:text-neutral-950 transition-all flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>Paid</span>
              </button>
            </div>
          </div>
        ))}

        {/* Active Debts Due */}
        {activeDebts.slice(0, 2).map((debt) => {
          const dueAmount = debt.minimumPaymentPaise || debt.emiAmountPaise || debt.currentBalancePaise;
          return (
            <div
              key={debt.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80"
            >
              <div>
                <div className="text-xs font-bold text-white truncate max-w-[160px]">
                  {debt.name}
                </div>
                <div className="text-[10px] text-rose-400 font-medium">
                  Bal: {formatINR(debt.currentBalancePaise)}
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <span className="text-xs font-extrabold text-neutral-200 tabular-nums">
                  {formatINR(dueAmount)}
                </span>
                <button
                  type="button"
                  disabled={processingId === debt.id}
                  onClick={() => handlePayDebt(debt.id, dueAmount)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-500/15 text-blue-300 hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Settle</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
